// Recrea la BD del E2E y su carpeta de imágenes antes de arrancar el servidor de pruebas.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { rmSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url?.includes("_e2e")) throw new Error(`reset-db solo actúa sobre una BD *_e2e (recibido: ${url})`);
const name = url.split("/").pop();
const admin = postgres(url.replace(/\/[^/]+$/, "/postgres"), { max: 1, onnotice: () => {} });
await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
await admin.unsafe(`CREATE DATABASE ${name}`);
await admin.end();
const sql = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(sql), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
await sql.end();
if (process.env.CARD_STORE_DIR?.includes("e2e")) rmSync(process.env.CARD_STORE_DIR, { recursive: true, force: true });
console.log(`BD ${name} recreada y migrada`);
