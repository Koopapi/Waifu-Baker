// Comprueba que el editor de carta muestra la imagen compuesta. Uso: node scripts/editor-check.mjs <png>
import { chromium } from "@playwright/test";
const base = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
await page.goto(`${base}/login?next=/admin/sets`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin/sets");
await page.click("a:text-is('WB01')");
await page.waitForSelector('[data-card-tile="1"]');
await page.click('[aria-label="Editar carta 001"]');
const img = page.locator("dialog img");
console.log("img en diálogo:", await img.count(), "src:", await img.getAttribute("src").catch(() => null));
await page.waitForTimeout(1500);
console.log("naturalWidth:", await img.evaluate((el) => el.naturalWidth).catch((e) => "error " + e.message));
await page.screenshot({ path: process.argv[2] });
await browser.close();
