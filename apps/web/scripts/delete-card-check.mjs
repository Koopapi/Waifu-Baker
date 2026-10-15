// Elimina una carta de WB01 desde el editor. Uso: node scripts/delete-card-check.mjs <número>
import { chromium } from "@playwright/test";
const n = String(process.argv[2]).padStart(3, "0");
const base = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 1000 } })).newPage();
page.on("dialog", (d) => d.accept());
await page.goto(`${base}/login?next=/admin/sets`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin/sets");
await page.click("a:text-is('WB01')");
await page.click(`[aria-label="Editar carta ${n}"]`);
await page.click("dialog >> text=Eliminar carta");
await page.waitForSelector("dialog", { state: "detached", timeout: 30000 });
await page.waitForTimeout(1000);
console.log("cartas ahora:", await page.locator("[data-card-tile]").count());
await browser.close();
