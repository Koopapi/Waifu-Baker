// pnpm demo — spec 010, RF-12 a RF-15: recrea la base de datos de la demo, la llena con la colección de
// fan art (demo/fanart.json, imágenes del taller ART_DIR) y arranca la web en modo demo en el puerto 3300.
// Nunca usa los datos de desarrollo ni habla con Patreon. Ctrl+C la detiene.
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.DEMO_PORT ?? 3300);
const DB = "waifu_baker_demo";
const base = `http://localhost:${PORT}`;
const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "development",
  DEMO_MODE: "1",
  DEV_LOGIN: "1",
  DATABASE_URL: `postgres://localhost:5432/${DB}`,
  CARD_STORE_DIR: path.resolve("var/demo-cards"),
  NEXT_DIST_DIR: ".next-demo",
  ART_DIR: process.env.ART_DIR || "/Users/koopa/Documents/Waifu Baker",
  // Sesiones propias de esta ejecución; nada de Patreon, Sentry ni tareas periódicas.
  AUTH_SECRET: randomBytes(32).toString("hex"),
  AUTH_TRUST_HOST: "true",
  ADMIN_PATREON_IDS: "",
  PATREON_CLIENT_ID: "",
  PATREON_CLIENT_SECRET: "",
  PATREON_CREATOR_ACCESS_TOKEN: "",
  PATREON_CREATOR_REFRESH_TOKEN: "",
  PATREON_CAMPAIGN_ID: "",
  SENTRY_DSN: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  SCHEDULER: "",
  BACKUP_DIR: path.resolve("var/demo-backups"),
};

const step = (msg: string) => console.log(`\x1b[35m▸\x1b[0m ${msg}`);

step(`Base de datos ${DB} desde cero`);
execFileSync("dropdb", ["--if-exists", "--force", DB], { stdio: "inherit" });
execFileSync("createdb", [DB], { stdio: "inherit" });
rmSync(env.CARD_STORE_DIR!, { recursive: true, force: true });
execFileSync("pnpm", ["exec", "drizzle-kit", "migrate"], { stdio: "inherit", env });

step(`Arrancando la web en modo demo (${base})`);
const server = spawn("pnpm", ["exec", "next", "dev", "--turbopack", "--port", String(PORT)], { stdio: "inherit", env });
const stop = () => {
  server.kill("SIGINT");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));

const deadline = Date.now() + 180_000;
while (Date.now() < deadline) {
  try {
    if ((await fetch(`${base}/login`)).ok) break;
  } catch {
    /* todavía arrancando */
  }
  await new Promise((r) => setTimeout(r, 1000));
}

step("Creando la colección de fan art, el coleccionista y el administrador");
const res = await fetch(`${base}/api/demo/seed`, { method: "POST" });
const body = await res.text();
if (!res.ok) {
  console.error(`No se pudo llenar la demo (${res.status}): ${body}`);
  stop();
}
const r = JSON.parse(body) as { cards: number };
await fetch(base).catch(() => {});
console.log(`\n\x1b[32m✔ Demo lista\x1b[0m con ${r.cards} cartas: ${base}\n  Entra como coleccionista o como administrador desde la portada. Ctrl+C para salir.\n`);
if (process.platform === "darwin" && !process.argv.includes("--no-open")) spawn("open", [base], { stdio: "ignore" });
