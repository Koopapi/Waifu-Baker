// Cada test empieza con la BD vacía (sin borrar las migraciones), así los proyectos de
// dispositivo pueden repetir los mismos datos sin chocar.
import { test as base, expect } from "@playwright/test";
import { rmSync } from "node:fs";
import postgres from "postgres";

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
}

export const test = base.extend<{ cleanDb: void }>({
  cleanDb: [
    async ({}, use) => {
      await resetData();
      await use();
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
