// pnpm backup — hace ahora una copia cifrada (spec 007, RF-13) y borra las de más de 30 días.
import path from "node:path";
import postgres from "postgres";
import { createBackup, pruneBackups } from "../src/server/backup/core.ts";

const { DATABASE_URL, BACKUP_DIR, BACKUP_PASSPHRASE, CARD_STORE_DIR } = process.env;
if (!DATABASE_URL || !BACKUP_DIR || !BACKUP_PASSPHRASE) {
  console.error("Faltan DATABASE_URL, BACKUP_DIR o BACKUP_PASSPHRASE (en .env.local).");
  process.exit(1);
}
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const [run] = await sql`insert into backup_runs (started_at) values (now()) returning id`;
try {
  const r = await createBackup({ databaseUrl: DATABASE_URL, cardsDir: CARD_STORE_DIR ?? path.resolve("var/cards"), outDir: BACKUP_DIR, passphrase: BACKUP_PASSPHRASE });
  const gone = await pruneBackups(BACKUP_DIR);
  await sql`update backup_runs set ok = true, finished_at = now(), file = ${path.basename(r.file)}, bytes = ${r.bytes} where id = ${run.id}`;
  console.log(`Copia hecha: ${r.file} (${(r.bytes / 1024 / 1024).toFixed(1)} MB). Tablas: ${Object.keys(r.manifest.tables).length}, imágenes: ${r.manifest.images}. Borradas por antigüedad: ${gone.length}.`);
} catch (e) {
  await sql`update backup_runs set ok = false, finished_at = now(), error = ${(e as Error).message.slice(0, 500)} where id = ${run.id}`;
  console.error("La copia falló:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
