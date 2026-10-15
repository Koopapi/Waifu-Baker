// Recorrido de la entrega 6: tiers y regalo de sobres. Uso: node scripts/admin-e6-smoke.mjs <outDir>
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = "http://localhost:3100";
const browser = await chromium.launch();
const login = async (name, admin) => {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 950 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(`${base}/login?next=/admin`);
  await page.fill('input[name="name"]', name);
  if (!admin) await page.uncheck('input[name="admin"]');
  await page.click("text=Entrar (desarrollo)");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
};
await (await login("fan-e6", false)).context().close();
const page = await login("koopa", true);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// Colección mínima publicada: 1 carta por sobre, una rara
await page.goto(`${base}/admin/sets`);
await page.fill('input[name="code"]', "TIER1");
await page.fill('form input[name="name"]', "Prueba de tiers");
await page.fill('input[name="packSize"]', "1");
await page.click("text=Crear colección");
await page.click("a:text-is('TIER1')");
await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
await page.setInputFiles('[data-testid="file-input"]', ["public/lab/09.webp"]);
await page.waitForSelector('[data-card-tile="1"]', { timeout: 30000 });
await page.check('[aria-label="Seleccionar carta 001"]');
await page.selectOption('[aria-label="Personaje para la selección"]', { label: "Aiko Hoshino" });
await page.selectOption('[aria-label="Rareza para la selección"]', "rare");
await page.click("text=Aplicar a la selección");
await page.waitForTimeout(1500);
await page.click('[aria-label="Editar carta 001"]');
await page.fill('dialog input[name="name"]', "Seiko de visita");
await page.click("dialog >> text=Guardar");
await page.waitForSelector("dialog", { state: "detached" });
for (const r of ["Épica", "Legendaria", "Secreta"]) await page.locator(`[aria-label="Ranura 1, ${r}"]`).fill("0");
await page.locator('[aria-label="Ranura 1, Rara"]').fill("100");
await page.click("text=Guardar probabilidades");
await page.waitForSelector("text=Probabilidades guardadas.");
await page.waitForTimeout(800);
await page.click("text=Comprobar y publicar");
await page.waitForSelector("text=/Colección publicada/", { timeout: 15000 });
console.log("TIER1 publicada");

// Tiers
await page.goto(`${base}/admin/tiers`);
await page.locator('[data-testid="tier-dev-sfw"] input[name="packsPerMonth"]').fill("3");
await page.locator('[data-testid="tier-dev-sfw"] >> text=Añadir colección').click();
await page.waitForSelector('[data-testid="tier-dev-sfw"] >> text=/Prueba de tiers/');
console.log("regla en tier SFW:", (await page.locator('[data-testid="tier-dev-sfw"]').innerText()).replace(/\s+/g, " ").slice(0, 120));
await page.screenshot({ path: `${out}/e6-1-tiers.png`, fullPage: true });

// Usuarios y regalo
await page.goto(`${base}/admin/users?q=fan-e6`);
await page.click("a:text-is('fan-e6')");
await page.waitForURL(/\/admin\/users\/[0-9a-f-]+$/);
await page.selectOption('select[name="setId"]', { label: "TIER1 · Prueba de tiers" });
await page.fill('input[name="count"]', "2");
await page.fill('input[name="reason"]', "Prueba nocturna del panel");
await page.click("button:has-text('Regalar sobres')");
await page.waitForSelector("text=/sobre\\(s\\) regalado/", { timeout: 10000 });
await page.waitForTimeout(800);
console.log("sobres sin abrir:", await page.locator('[data-testid="sealed-packs"] h2').textContent());
await page.screenshot({ path: `${out}/e6-2-user.png`, fullPage: true });
console.log(errors.length ? `errores de página: ${errors.join(" | ")}` : "sin errores de página");
await browser.close();
