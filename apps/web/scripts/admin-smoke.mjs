// Comprobación rápida de RF-1/RF-2 contra el servidor de desarrollo. Uso: node scripts/admin-smoke.mjs [baseUrl] [outDir]
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3100";
const out = process.argv[3];
const browser = await chromium.launch();

async function as(name, admin) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  if (name) {
    await page.goto(`${base}/login?next=/admin`);
    await page.fill('input[name="name"]', name);
    if (!admin) await page.uncheck('input[name="admin"]');
    await page.click("text=Entrar (desarrollo)");
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }
  const res = await page.goto(`${base}/admin/sets`);
  const status = res.status();
  const heading = await page.locator("h1").first().textContent().catch(() => null);
  if (out && admin) await page.goto(`${base}/admin`).then(() => page.screenshot({ path: `${out}/admin-home.png` }));
  await ctx.close();
  return { status, heading };
}

console.log("anónimo     ", await as(null, false));
console.log("usuario     ", await as("fan", false));
console.log("administrador", await as("koopa", true));
await browser.close();
