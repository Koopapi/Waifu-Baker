// Recrea la BD de pruebas y aplica las migraciones una vez por ejecución.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";

export const TEST_DB = "waifu_baker_test";
export const TEST_URL = process.env.TEST_DATABASE_URL ?? `postgres://localhost:5432/${TEST_DB}`;

export default async function setup() {
  const admin = postgres(TEST_URL.replace(/\/[^/]+$/, "/postgres"), { max: 1, onnotice: () => {} });
  await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const sql = postgres(TEST_URL, { max: 1, onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  await sql.end();
}
