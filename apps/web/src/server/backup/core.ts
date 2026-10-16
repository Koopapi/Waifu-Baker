// Spec 007, RF-13 a RF-15: copias cifradas de la BD y de las imágenes, rotación y restauración.
// Sin alias ni imports de la app: lo usan el programador de tareas y los scripts de `pnpm backup`.
import { execFile } from "node:child_process";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import postgres from "postgres";

const run = promisify(execFile);
const MAGIC = Buffer.from("WBK1");
const SALT = 16;
const IV = 12;
const TAG = 16;
export const BACKUP_RETENTION_DAYS = 30;
export const BACKUP_PREFIX = "wb-backup-";
export const BACKUP_EXT = ".wbk";

export interface Manifest {
  createdAt: string;
  database: string;
  tables: Record<string, number>;
  images: number;
}

function keyFor(passphrase: string, salt: Buffer) {
  if (!passphrase || passphrase.length < 12) throw new Error("BACKUP_PASSPHRASE debe tener al menos 12 caracteres.");
  return scryptSync(passphrase, salt, 32);
}

/** Cifra un archivo con AES-256-GCM: «WBK1» + sal + IV + datos + etiqueta. */
export async function encryptFile(src: string, dest: string, passphrase: string) {
  const salt = randomBytes(SALT);
  const iv = randomBytes(IV);
  const cipher = createCipheriv("aes-256-gcm", keyFor(passphrase, salt), iv);
  const out = createWriteStream(dest);
  out.write(Buffer.concat([MAGIC, salt, iv]));
  await pipeline(createReadStream(src), cipher, out, { end: false });
  await new Promise<void>((resolve, reject) => out.end(cipher.getAuthTag(), (e?: Error | null) => (e ? reject(e) : resolve())));
}

/** Descifra y verifica la etiqueta; con una clave equivocada o un archivo alterado, falla. */
export async function decryptFile(src: string, dest: string, passphrase: string) {
  const size = (await stat(src)).size;
  const fd = await readFile(src);
  if (size < MAGIC.length + SALT + IV + TAG || !fd.subarray(0, 4).equals(MAGIC)) throw new Error("No es una copia de Waifu Baker.");
  const salt = fd.subarray(4, 4 + SALT);
  const iv = fd.subarray(4 + SALT, 4 + SALT + IV);
  const tag = fd.subarray(size - TAG);
  const decipher = createDecipheriv("aes-256-gcm", keyFor(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  const body = Buffer.concat([decipher.update(fd.subarray(4 + SALT + IV, size - TAG)), decipher.final()]);
  await writeFile(dest, body);
}

async function countImages(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? await countImages(path.join(dir, e.name)) : 1;
  }
  return n;
}

async function tableCounts(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    const tables = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' order by tablename`;
    const out: Record<string, number> = {};
    for (const t of tables) out[t.tablename] = Number((await sql.unsafe(`select count(*)::int as n from "${t.tablename}"`))[0].n);
    return out;
  } finally {
    await sql.end();
  }
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");

/** RF-13: copia de la BD (pg_dump) y de la carpeta de imágenes, con manifiesto, cifrada. */
export async function createBackup(opts: { databaseUrl: string; cardsDir: string; outDir: string; passphrase: string; now?: Date }) {
  const now = opts.now ?? new Date();
  keyFor(opts.passphrase, randomBytes(SALT));
  await mkdir(opts.outDir, { recursive: true });
  const work = await mkdtemp(path.join(tmpdir(), "wb-backup-"));
  try {
    await run("pg_dump", ["-Fc", "--no-owner", "--no-acl", "-f", path.join(work, "db.dump"), opts.databaseUrl]);
    const manifest: Manifest = {
      createdAt: now.toISOString(),
      database: new URL(opts.databaseUrl).pathname.slice(1),
      tables: await tableCounts(opts.databaseUrl),
      images: await countImages(opts.cardsDir),
    };
    await writeFile(path.join(work, "manifest.json"), JSON.stringify(manifest, null, 2));
    await mkdir(path.join(work, "cards"), { recursive: true });
    if (existsSync(opts.cardsDir)) await cp(opts.cardsDir, path.join(work, "cards"), { recursive: true });
    const bundle = path.join(work, "bundle.tgz");
    await run("tar", ["-czf", bundle, "-C", work, "db.dump", "manifest.json", "cards"]);
    const file = path.join(opts.outDir, `${BACKUP_PREFIX}${stamp(now)}${BACKUP_EXT}`);
    await encryptFile(bundle, file, opts.passphrase);
    return { file, bytes: (await stat(file)).size, manifest };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

/** RF-14: borra las copias con más de 30 días (por la fecha de su nombre). */
export async function pruneBackups(outDir: string, now = new Date(), days = BACKUP_RETENTION_DAYS) {
  if (!existsSync(outDir)) return [];
  const limit = now.getTime() - days * 86_400_000;
  const gone: string[] = [];
  for (const f of await readdir(outDir)) {
    const m = f.match(/^wb-backup-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.wbk$/);
    if (!m) continue;
    const when = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    if (when < limit) {
      await rm(path.join(outDir, f), { force: true });
      gone.push(f);
    }
  }
  return gone;
}

/**
 * RF-15: restaura en una BD aparte (que se recrea) y en una carpeta aparte, y compara con el
 * manifiesto. Nunca toca la BD en uso: el destino debe tener otro nombre.
 */
export async function restoreBackup(opts: { file: string; passphrase: string; targetDatabaseUrl: string; targetCardsDir: string; liveDatabaseUrl?: string }) {
  const target = new URL(opts.targetDatabaseUrl).pathname.slice(1);
  if (opts.liveDatabaseUrl && new URL(opts.liveDatabaseUrl).pathname.slice(1) === target) throw new Error("El destino de la restauración no puede ser la base de datos en uso.");
  const work = await mkdtemp(path.join(tmpdir(), "wb-restore-"));
  try {
    const bundle = path.join(work, "bundle.tgz");
    await decryptFile(opts.file, bundle, opts.passphrase);
    await run("tar", ["-xzf", bundle, "-C", work]);
    const manifest = JSON.parse(await readFile(path.join(work, "manifest.json"), "utf8")) as Manifest;
    const admin = postgres(opts.targetDatabaseUrl.replace(/\/[^/]+$/, "/postgres"), { max: 1, onnotice: () => {} });
    try {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${target}" WITH (FORCE)`);
      await admin.unsafe(`CREATE DATABASE "${target}"`);
    } finally {
      await admin.end();
    }
    await run("pg_restore", ["--no-owner", "--no-acl", "-d", opts.targetDatabaseUrl, path.join(work, "db.dump")]);
    await rm(opts.targetCardsDir, { recursive: true, force: true });
    await cp(path.join(work, "cards"), opts.targetCardsDir, { recursive: true });
    const tables = await tableCounts(opts.targetDatabaseUrl);
    const images = await countImages(opts.targetCardsDir);
    const mismatches = [
      ...Object.entries(manifest.tables)
        .filter(([t, n]) => tables[t] !== n)
        .map(([t, n]) => `${t}: ${tables[t] ?? "falta"} de ${n}`),
      ...(images === manifest.images ? [] : [`imágenes: ${images} de ${manifest.images}`]),
    ];
    return { ok: mismatches.length === 0, manifest, tables, images, mismatches };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
