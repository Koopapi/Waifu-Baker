// Cada test empieza con la BD vacía (sin borrar las migraciones), así los proyectos de
// dispositivo pueden repetir los mismos datos sin chocar.
import { test as base, expect } from "@playwright/test";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import postgres from "postgres";
import { API_CALLS, BASE, ROUTES } from "./warm";

const DB = "postgres://localhost:5432/waifu_baker_e2e";
const STORE = "/tmp/waifu-baker-e2e-cards";

async function resetData() {
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
    if (rows.length) await sql.unsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await sql.end();
  }
  rmSync(STORE, { recursive: true, force: true });
  // Miembros simulados de Patreon (spec 001): viven en la memoria del servidor de pruebas.
  await fetch(`${BASE}/api/dev/patreon-member`, { method: "DELETE" }).catch(() => undefined);
  // Reloj de pruebas de la spec 009: cada test empieza en la hora real.
  await fetch(`${BASE}/api/dev/clock`, { method: "DELETE" }).catch(() => undefined);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `next dev` retiene memoria en cada página servida y, al pasar del 80 % del montón, se reinicia solo
 * en mitad de un test (navegaciones interrumpidas, recargas completas en WebKit). Antes de cada test
 * se recoge la basura del servidor y, si hace falta, se reinicia aquí, entre tests, y se vuelven a
 * compilar las rutas. El uso de memoria queda en `test-results/server-memory.log`.
 */
async function keepServerFit(title: string) {
  const res = await fetch(`${BASE}/api/dev/memory`, { method: "POST" }).catch(() => null);
  if (!res?.ok) return;
  const m = (await res.json()) as { usedMb: number; limitMb: number; restarting: boolean };
  mkdirSync("test-results", { recursive: true });
  appendFileSync("test-results/server-memory.log", `${new Date().toISOString()} ${m.usedMb}/${m.limitMb} MB${m.restarting ? " → reinicio" : ""} · ${title}\n`);
  if (!m.restarting) return;
  await sleep(2_000);
  for (let i = 0; ; i++) {
    const ok = await fetch(`${BASE}/login`).then((r) => r.ok, () => false);
    if (ok) break;
    if (i > 120) throw new Error("El servidor de pruebas no volvió tras el reinicio controlado.");
    await sleep(1_000);
  }
  for (const r of ROUTES) await fetch(`${BASE}${r}`, { redirect: "manual" }).catch(() => undefined);
  for (const c of API_CALLS) await fetch(`${BASE}${c.path}`, { method: c.method, body: c.body }).catch(() => undefined);
}

export const test = base.extend<{ cleanDb: void; closeContexts: void }>({
  cleanDb: [
    async ({}, use, testInfo) => {
      await keepServerFit(`${testInfo.project.name} › ${testInfo.title}`);
      await resetData();
      await use();
    },
    // El reinicio controlado y la recompilación no cuentan para el tiempo del test.
    { auto: true, timeout: 300_000 },
  ],
  // Los tests abren contextos con browser.newContext(); si no se cierran, sus páginas animadas se
  // acumulan en el navegador compartido y WebKit se vuelve cada vez más lento.
  closeContexts: [
    async ({ browser }, use) => {
      const before = new Set(browser.contexts());
      await use();
      await Promise.all(browser.contexts().filter((c) => !before.has(c)).map((c) => c.close().catch(() => undefined)));
    },
    { auto: true },
  ],
});

export { expect };

/** El panel se usa en escritorio en todos los proyectos. */
export const DESKTOP = {
  viewport: { width: 1360, height: 950 },
  isMobile: false,
  hasTouch: false,
  deviceScaleFactor: 1,
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
};

/** Solo para pruebas que fijan su propio tamaño de pantalla o recorren el panel. */
export const desktopOnly = () => test.skip(test.info().project.name !== "chromium-desktop", "solo en escritorio");
