// Captura el resumen y la ficha de WB01 a ancho de tableta (RNF: ≥ 768 px). Uso: node scripts/tablet-check.mjs <outDir>
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 820, height: 1180 } })).newPage();
await page.goto(`${base}/login?next=/admin`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin");
await page.screenshot({ path: `${out}/tablet-home.png` });
await page.click("a:has-text('WB01'):not(:has-text('WB01A'))");
await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
await page.waitForTimeout(800);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log("desbordamiento horizontal (px):", overflow);
await page.screenshot({ path: `${out}/tablet-set.png`, fullPage: false });
await browser.close();
