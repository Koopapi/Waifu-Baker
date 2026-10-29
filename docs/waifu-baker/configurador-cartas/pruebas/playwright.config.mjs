import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4173/' },
  webServer: { command: 'node servidor.mjs 4173', url: 'http://localhost:4173/creador-cartas.html', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
