// Pulsa «Regenerar imágenes» en WB01 y captura la cuadrícula. Uso: node scripts/regenerate-check.mjs <png>
import { chromium } from "@playwright/test";
const base = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 1000 } })).newPage();
await page.goto(`${base}/login?next=/admin/sets`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin/sets");
await page.click("a:text-is('WB01')");
await page.waitForSelector('[data-card-tile="1"]');
const t0 = Date.now();
await page.click("text=Regenerar imágenes");
await page.waitForSelector("text=/regenerada/", { timeout: 60000 });
console.log(`${await page.locator("text=/regenerada/").textContent()} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
await page.waitForTimeout(1500);
await page.locator('[data-testid="card-grid"]').scrollIntoViewIfNeeded();
await page.locator('[data-testid="card-grid"]').screenshot({ path: process.argv[2] });
await browser.close();
