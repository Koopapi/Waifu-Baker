// Recorrido de la entrega 5: regenerar, vista previa con holo y simulación. Uso: node scripts/admin-e5-smoke.mjs <outDir>
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1360, height: 950 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/login?next=/admin/sets`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin/sets");
await page.click("a:text-is('WB01')");
await page.waitForSelector('[data-card-tile="1"]');
await page.click("text=Regenerar imágenes");
await page.waitForSelector("text=/regenerada/", { timeout: 60000 });
console.log(await page.locator("text=/regenerada/").textContent());
await page.waitForTimeout(800);

await page.click('[aria-label="Editar carta 001"]');
const pv = page.locator('[data-testid="card-preview"]');
await pv.waitFor();
const box = await pv.boundingBox();
await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25, { steps: 8 });
await page.check("text=Ver con efecto holo");
await page.waitForTimeout(700);
await pv.screenshot({ path: `${out}/e5-1-preview.png` });
await page.keyboard.press("Escape");

await page.click('[data-testid="simulate-link"]');
await page.waitForURL(/simulate$/);
await page.waitForSelector(".pack__strip");
const strip = await page.locator(".pack__strip").boundingBox();
const sx = strip.x + strip.width * 0.3, sy = strip.y + strip.height / 2;
await page.mouse.move(sx, sy);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(sx + (220 * i) / 12, sy);
await page.mouse.up();
await page.waitForSelector('.stage[data-phase="fanned"]', { timeout: 15000 });
await page.locator('.card3d[role="button"]').first().click();
await page.waitForTimeout(950);
await page.screenshot({ path: `${out}/e5-2-sim-reveal.png` });
for (let k = 1; k < 5; k++) {
  await page.waitForSelector(`.stage[data-revealed="${k}"]`, { timeout: 10000 });
  await page.locator('.card3d[role="button"]').first().click();
}
await page.waitForSelector(".summary", { timeout: 10000 });
console.log("resumen:", (await page.locator(".summary__row").allInnerTexts()).map((t) => t.replace(/\s+/g, " ")).join(" | "));
await page.screenshot({ path: `${out}/e5-3-sim-summary.png` });
console.log(errors.length ? `errores de página: ${errors.join(" | ")}` : "sin errores de página");
await browser.close();
