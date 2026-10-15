// Recorrido de la entrega 2 del panel. Uso: node scripts/admin-e2-smoke.mjs <outDir> [baseUrl]
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://localhost:3100";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const msg = async () =>
  (await page.locator('form:has(button) [role="alert"], form:has(button) p.text-emerald-300').first().textContent().catch(() => ""))?.trim();

await page.goto(`${base}/login?next=/admin/sets`);
await page.fill('input[name="name"]', "koopa");
await page.click("text=Entrar (desarrollo)");
await page.waitForURL((u) => u.pathname === "/admin/sets");

async function createSet(code, name, adult) {
  await page.fill('input[name="code"]', code);
  await page.fill('form input[name="name"]', name);
  if (adult) await page.check('input[name="isAdult"]');
  await page.click("text=Crear colección");
  await page.waitForTimeout(700);
  return msg();
}
console.log("crear WB01   →", await createSet("WB01", "Colección base", false));
console.log("crear WB01A  →", await createSet("WB01A", "Colección base 18+", true));
console.log("repetir WB01 →", await createSet("wb01", "Otra", false));
await page.screenshot({ path: `${out}/e2-sets.png` });

await page.click("text=WB01A");
await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
await page.fill('form input[name="name"]', "Base 18+ (otoño)");
await page.fill('input[name="packSize"]', "6");
await page.click("text=Guardar");
await page.waitForTimeout(700);
console.log("editar WB01A →", await msg());
await page.screenshot({ path: `${out}/e2-set-detail.png` });

await page.goto(`${base}/admin/characters`);
for (const [name, bio] of [["Aiko Hoshino", "Vampira de oficina"], ["Mei Kurosawa", "Piloto de mechas"]]) {
  await page.fill('form:has-text("Nuevo personaje") input[name="name"]', name);
  await page.fill('form:has-text("Nuevo personaje") textarea[name="bio"]', bio);
  await page.click("text=Crear personaje");
  await page.waitForTimeout(700);
  console.log(`crear ${name} →`, await msg());
}
await page.click("summary:has-text('Mei Kurosawa')");
await page.locator("details[open] button:has-text('Borrar personaje')").click();
await page.waitForTimeout(700);
console.log("borrar Mei   →", await msg());
await page.click("summary:has-text('Aiko Hoshino')");
await page.screenshot({ path: `${out}/e2-characters.png` });
console.log(errors.length ? `errores de página: ${errors.join(" | ")}` : "sin errores de página");
await browser.close();
