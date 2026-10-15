// Captura el flujo de /lab en escritorio y móvil. Uso: node scripts/lab-shots.mjs <outDir> [baseUrl]
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? "./lab-shots";
const base = process.argv[3] ?? "http://localhost:3100";
mkdirSync(out, { recursive: true });

const targets = [
  { name: "desktop", ctx: { viewport: { width: 1280, height: 800 } } },
  { name: "iphone", ctx: { ...devices["iPhone 14"] } },
];

const browser = await chromium.launch();
for (const t of targets) {
  const context = await browser.newContext(t.ctx);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${base}/lab`, { waitUntil: "networkidle" });
  const shot = (n) => page.screenshot({ path: `${out}/${t.name}-${n}.png` });

  await page.waitForSelector(".pack__strip");
  await page.waitForTimeout(400);
  await shot("1-idle");

  const strip = await page.locator(".pack__strip").boundingBox();
  const sx = strip.x + strip.width * 0.3, sy = strip.y + strip.height / 2;
  if (t.ctx.hasTouch) {
    // En pantallas táctiles use-gesture escucha touch*, no pointer*: se envían toques reales por CDP.
    const cdp = await context.newCDPSession(page);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    await touch("touchStart", sx, sy);
    for (let i = 1; i <= 12; i++) { await touch("touchMove", sx + (220 * i) / 12, sy); await page.waitForTimeout(16); }
    await shot("2-tearing");
    await touch("touchEnd", 0, 0);
  } else {
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(sx + (220 * i) / 12, sy); await page.waitForTimeout(16); }
    await shot("2-tearing");
    await page.mouse.up();
  }
  await page.waitForSelector(".card3d", { timeout: 5000 });
  await page.waitForTimeout(1500);
  await shot("3-fanned");

  await page.locator('.card3d[role="button"]').first().click();
  await page.waitForTimeout(950);
  await shot("4-revealed");
  await page.waitForTimeout(1200);
  await shot("5-tray");

  for (let k = 1; k < 5; k++) {
    await page.waitForSelector(`.stage[data-revealed="${k}"]`, { timeout: 8000 });
    await page.locator('.card3d[role="button"]').first().click();
  }
  await page.waitForSelector('.stage[data-revealed="5"]', { timeout: 8000 });
  await page.waitForSelector(".summary", { timeout: 5000 });
  await page.waitForTimeout(300);
  await shot("6-summary");
  console.log(`${t.name}: ok${errors.length ? `, errores: ${errors.join(" | ")}` : ""}`);
  await context.close();
}
await browser.close();
