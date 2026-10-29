// Capturas de la apertura nueva (spec 023) contra la demo local: `node scripts/s023-shots.mjs <carpeta>`.
import { chromium, devices } from "@playwright/test";

const out = process.argv[2] ?? "/tmp";
const base = "http://localhost:3300";
const browser = await chromium.launch();
// El administrador de la demo regala sobres para tener qué abrir (2 plata y 1 gold).
const admin = await (await browser.newContext()).newPage();
await admin.goto(`${base}/login?next=/admin`);
await admin.fill('input[name="name"]', "demo-admin");
await admin.locator('form:has(input[name="name"]) input[type="checkbox"]').setChecked(true);
await admin.locator('form:has(input[name="name"]) button[type="submit"]').click();
await admin.waitForURL(/\/admin/, { timeout: 60_000 });
for (const kind of ["silver", "gold"]) {
  // La primera petición a la ruta en `next dev` puede llegar antes de que compile: se reintenta.
  for (let i = 0; i < 4; i++) {
    const r = await admin.request.post(`${base}/api/dev/seed`, { data: { action: "gift", userName: "demo-collector", setCode: "FA01", count: kind === "gold" ? 1 : 2, reason: "Capturas spec 023", kind } });
    console.log("regalo", kind, r.status());
    if (r.ok()) break;
    await admin.waitForTimeout(1500);
  }
}
const page = await (await browser.newContext({ ...devices["iPhone 14"], browserName: undefined })).newPage();
page.on("pageerror", (e) => console.log("ERROR de página:", e.message));
await page.context().addCookies([{ name: "wb_locale", value: "es", url: base }]);
await page.goto(`${base}/login?next=/sobres`);
await page.fill('input[name="name"]', "demo-collector");
await page.locator('form:has(input[name="name"]) input[type="checkbox"]').setChecked(false);
await page.locator('form:has(input[name="name"]) button[type="submit"]').click();
await page.waitForURL(/\/sobres/, { timeout: 60_000 });
await page.waitForLoadState("networkidle");
const dlg = page.locator('[data-testid="celebration-close"]');
if (await dlg.isVisible().catch(() => false)) await dlg.click();
await page.waitForTimeout(800);
if (await dlg.isVisible().catch(() => false)) await dlg.click();
await page.screenshot({ path: `${out}/1-mis-sobres.png`, fullPage: true });
// RF-22: si había una apertura sin terminar, se retoma directamente en el mazo.
const pending = page.locator('[data-testid="pending-opening"]');
if (await pending.isVisible().catch(() => false)) {
  await pending.click();
  await page.waitForSelector('.stage[data-phase="deck"]', { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/0-retomada.png` });
  await page.goto(`${base}/sobres`);
  await page.waitForLoadState("networkidle");
  if (await dlg.isVisible().catch(() => false)) await dlg.click();
}
await page.screenshot({ path: `${out}/1-mis-sobres.png`, fullPage: true });
await page.locator('[data-testid="group-FA01-gold"] >> text=Abrir un sobre').click();
await page.waitForSelector(".tear__hit", { timeout: 60_000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/2-sobre.png` });
// Rasgado a medias con el dedo.
const box = await page.locator(".tear__hit").boundingBox();
const y = box.y + box.height / 2;
await page.evaluate(({ x0, y }) => {
  const el = document.querySelector(".tear__hit");
  const fire = (type, x) => {
    const t = { identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y, screenX: x, screenY: y };
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(ev, { touches: { value: type === "touchend" ? [] : [t] }, targetTouches: { value: type === "touchend" ? [] : [t] }, changedTouches: { value: [t] } });
    el.dispatchEvent(ev);
  };
  window.__tear = fire;
  fire("touchstart", x0);
  for (let i = 1; i <= 8; i++) fire("touchmove", x0 + i * 12);
}, { x0: box.x + 30, y });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/3-rasgando.png` });
await page.evaluate(({ x0 }) => { for (let i = 9; i <= 20; i++) window.__tear("touchmove", x0 + i * 12); window.__tear("touchend", x0 + 240); }, { x0: box.x + 30 });
await page.waitForSelector('.stage[data-phase="deck"]', { timeout: 30_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/4-mazo.png` });
for (let i = 1; i <= 5; i++) {
  await page.locator('.card3d[role="button"]').first().click();
  await page.waitForSelector('[data-testid="reveal-info"]', { timeout: 15_000 });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}/5-revelada-${i}.png` });
  await page.locator('.card3d[role="button"]').first().click();
  await page.waitForTimeout(700);
}
await page.waitForSelector(".summary", { timeout: 15_000 });
await page.screenshot({ path: `${out}/6-resumen.png` });
await browser.close();
