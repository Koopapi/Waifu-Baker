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
  // La batería completa dura más de 10 min: con el límite por defecto, `next dev` se reinicia a mitad.
  NODE_OPTIONS: "--max-old-space-size=8192",
};

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
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
