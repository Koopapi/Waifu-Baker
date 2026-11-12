import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const env = {
  DATABASE_URL: "postgres://localhost:5432/waifu_baker_e2e",
  CARD_STORE_DIR: "/tmp/waifu-baker-e2e-cards",
  NEXT_DIST_DIR: ".next-e2e",
  DEV_LOGIN: "1",
  AUTH_SECRET: "e2e-secreto-solo-para-pruebas-locales-0123456789",
  AUTH_TRUST_HOST: "true",
  ADMIN_PATREON_IDS: "",
  // El E2E nunca habla con Patreon de verdad.
  PATREON_CREATOR_ACCESS_TOKEN: "",
  PATREON_CAMPAIGN_ID: "",
  PATREON_WEBHOOK_SECRET: "e2e-webhook-secret",
  CONTACT_EMAIL: "hello@waifubaker.test",
  SENTRY_DSN: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  SCHEDULER: "",
  // Spec 037: la regeneración de imágenes fijas no corre durante las E2E (cada test siembra las suyas al día).
  FLAT_REGEN: "0",
  // Spec 010: modo demo con una colección pequeña hecha con las imágenes de public/lab.
  DEMO_MODE: "1",
  DEMO_MANIFEST: "e2e/demo-manifest.json",
  ART_DIR: "public/lab",
  // `next dev` retiene memoria por cada página servida y se reinicia solo al pasar del 80 % del montón:
  // montón amplio y `--expose-gc` para que `/api/dev/memory` recoja la basura y, si hace falta, lo
  // reinicie entre dos tests (`e2e/fixtures.ts`) en vez de en mitad de uno.
  // En CI (16 GB) el montón es de 12 GB: con todas las rutas compiladas el servidor ya ocupa ~4,4 GB (nov 2026) y con
  // 8 GB el reinicio controlado (60 %) saltaba cada dos o tres tests, ~5 min cada vez. En la Mac se queda en 8 GB.
  NODE_OPTIONS: `--max-old-space-size=${process.env.CI ? 12288 : 8192} --expose-gc`,
};

export default defineConfig({
  testDir: "e2e",
  // Los ejecutores de GitHub son bastante más lentos que un Mac: allí se dobla la espera.
  timeout: process.env.CI ? 360_000 : 180_000,
  expect: { timeout: process.env.CI ? 30_000 : 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Los E2E de las specs 003 a 006 comprueban textos en español; la spec 008 prueba el inglés.
    storageState: { cookies: [{ name: "wb_locale", value: "es", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] },
  },
  // El coleccionista y el visitante usan el dispositivo del proyecto; el panel, siempre escritorio.
  projects: [
    { name: "warmup", testMatch: /warmup\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-desktop", dependencies: ["warmup"], use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 950 } } },
    { name: "pixel-7", dependencies: ["warmup"], use: { ...devices["Pixel 7"] } },
    { name: "iphone-14", dependencies: ["warmup"], use: { ...devices["iPhone 14"] } },
    { name: "reduced-motion", dependencies: ["warmup"], use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 950 }, contextOptions: { reducedMotion: "reduce" } } },
  ],
  webServer: {
    command: `node e2e/reset-db.mjs && pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    env,
  },
});
