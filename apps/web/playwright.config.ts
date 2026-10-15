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
};

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 950 } } }],
  webServer: {
    command: `node e2e/reset-db.mjs && pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    env,
  },
});
