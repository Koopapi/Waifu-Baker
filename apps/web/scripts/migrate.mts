// Spec 024, RF-2: aplica las migraciones pendientes al arrancar el contenedor (antes de servir la nueva versión).
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle") });
  console.log("Migraciones al día.");
} catch (e) {
  console.error("Las migraciones fallaron:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
