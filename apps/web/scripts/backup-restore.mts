// pnpm backup:restore [archivo.wbk] — restaura en una BD aparte (<bd>_restore) y en var/restore, y
// comprueba que coincide con el manifiesto (spec 007, RF-15). Nunca toca la BD en uso.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { restoreBackup } from "../src/server/backup/core.ts";

const { DATABASE_URL, BACKUP_DIR, BACKUP_PASSPHRASE } = process.env;
if (!DATABASE_URL || !BACKUP_DIR || !BACKUP_PASSPHRASE) {
  console.error("Faltan DATABASE_URL, BACKUP_DIR o BACKUP_PASSPHRASE (en .env.local).");
  process.exit(1);
}
const file =
  process.argv[2] ??
  path.join(BACKUP_DIR, (await readdir(BACKUP_DIR)).filter((f) => f.startsWith("wb-backup-") && f.endsWith(".wbk")).sort().at(-1) ?? "");
const target = DATABASE_URL.replace(/\/([^/]+)$/, "/$1_restore");
const r = await restoreBackup({ file, passphrase: BACKUP_PASSPHRASE, targetDatabaseUrl: target, targetCardsDir: path.resolve("var/restore/cards"), liveDatabaseUrl: DATABASE_URL });
console.log(`Restaurada ${path.basename(file)} en ${new URL(target).pathname.slice(1)} y var/restore/cards.`);
console.log(r.ok ? `Completa: ${Object.keys(r.tables).length} tablas y ${r.images} imágenes coinciden con el manifiesto.` : `NO coincide: ${r.mismatches.join("; ")}`);
process.exitCode = r.ok ? 0 : 1;
