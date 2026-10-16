// pnpm showcase <carpeta> [escritorio|movil] — recorre la demo (pnpm demo, puerto 3300) y captura cada
// pantalla para enseñarla. Escribe <carpeta>/<dispositivo>/NN-nombre.jpg y <carpeta>/<dispositivo>/manifest.json.
// Abre sobres: conviene ejecutarlo con la demo recién creada (una pasada por dispositivo).
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.SHOWCASE_URL ?? "http://localhost:3300";
const out = path.resolve(process.argv[2] ?? "showcase");
const device = process.argv[3] ?? "escritorio";
const phone = device === "movil";
const dir = path.join(out, device);
mkdirSync(dir, { recursive: true });

const ctxOpts = phone ? { ...devices["iPhone 14"], browserName: undefined } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 };
delete ctxOpts.defaultBrowserType;
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...ctxOpts, locale: "es-ES" });
await ctx.addCookies([{ name: "wb_locale", value: "es", url: BASE }]);
const page = await ctx.newPage();
const shots = [];
let n = 0;

async function shot(slug, title, section, opts = {}) {
  n += 1;
  const file = `${String(n).padStart(2, "0")}-${slug}.jpg`;
  try {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(opts.wait ?? 700);
    if (opts.full) {
      // Página larga: la ventana se estira a toda la altura (así el menú lateral, fijo a la ventana, llega abajo).
      const size = page.viewportSize();
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: size.width, height: Math.min(h, 6000) });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, file), type: "jpeg", quality: 82 });
      await page.setViewportSize(size);
    } else {
      await page.screenshot({ path: path.join(dir, file), type: "jpeg", quality: 82 });
    }
    shots.push({ file, title, section });
    console.log(`✓ ${file}`);
  } catch (e) {
    console.log(`✗ ${file}: ${e.message.split("\n")[0]}`);
  }
}
const go = async (p) => page.goto(BASE + p);
const step = async (label, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log(`✗ ${label}: ${e.message.split("\n")[0]}`);
  }
};
const openMenu = async () => {
  if (phone) await page.click('[data-testid="menu-button"]').catch(() => {});
};

// ——— Público y entrada ———
await go("/");
await shot("portada", "Portada de la demo", "Entrada");
await go("/drop-rates");
await shot("probabilidades", "Probabilidades públicas", "Entrada", { full: !phone });
await go("/legal/terms");
await shot("terminos", "Términos de uso", "Entrada");
await go("/login");
await shot("login", "Entrar (Patreon o desarrollo)", "Entrada");
await step("bienvenida", async () => {
  await page.fill('input[name="name"]', `visita-${device}`);
  const box = page.locator('form:has(input[name="name"]) button[role="checkbox"]');
  if ((await box.getAttribute("aria-checked")) === "true") await box.click();
  await page.click('form:has(input[name="name"]) button[type="submit"]');
  await page.waitForURL(/bienvenida/, { timeout: 30_000 });
  await shot("bienvenida", "Bienvenida: edad y términos", "Entrada");
  await ctx.clearCookies();
  await ctx.addCookies([{ name: "wb_locale", value: "es", url: BASE }]);
});

// ——— Coleccionista ———
await go("/");
await page.click('[data-testid="demo-enter-collector"]');
await page.waitForURL(/\/sobres/);
await shot("mis-sobres", "Mis sobres", "Coleccionista");
if (phone) {
  await openMenu();
  await shot("menu", "Menú lateral (móvil)", "Coleccionista", { wait: 500 });
  await page.keyboard.press("Escape");
}
const setHref = await page.locator('[data-testid="group-FA01"] a').first().getAttribute("href");
await step("apertura", async () => {
  await go(setHref);
  await page.waitForSelector(".pack__strip");
  await shot("apertura-sobre", "Apertura: el sobre", "Apertura de sobres", { wait: 1200 });
  if (await page.locator(".pack__cta").isVisible()) await page.click(".pack__cta");
  else {
    const strip = await page.locator(".pack__strip").boundingBox();
    if (phone) {
      await page.evaluate(async () => {
        const el = document.querySelector(".pack__strip");
        const r = el.getBoundingClientRect();
        const sx = r.left + r.width * 0.3, sy = r.top + r.height / 2;
        const fire = (type, x) => {
          const t = { identifier: 1, target: el, clientX: x, clientY: sy, pageX: x, pageY: sy, screenX: x, screenY: sy };
          const ev = new Event(type, { bubbles: true, cancelable: true });
          Object.defineProperties(ev, { touches: { value: type === "touchend" ? [] : [t] }, targetTouches: { value: type === "touchend" ? [] : [t] }, changedTouches: { value: [t] } });
          el.dispatchEvent(ev);
        };
        fire("touchstart", sx);
        for (let i = 1; i <= 12; i++) {
          await new Promise((res) => setTimeout(res, 16));
          fire("touchmove", sx + (220 * i) / 12);
        }
        fire("touchend", sx + 220);
      });
    } else {
      const sx = strip.x + strip.width * 0.3, sy = strip.y + strip.height / 2;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(sx + (220 * i) / 12, sy);
      await page.mouse.up();
    }
  }
  await page.waitForSelector('.stage[data-phase="fanned"]', { timeout: 30_000 });
  await shot("apertura-abanico", "Apertura: las cartas en abanico", "Apertura de sobres", { wait: 1500 });
  await page.locator('.card3d[role="button"]').first().click();
  await shot("apertura-revelada", "Apertura: carta revelada", "Apertura de sobres", { wait: 1600 });
  for (let i = 0; i < 10 && !(await page.locator(".summary").isVisible()); i++) {
    await page.locator('.card3d[role="button"]').first().click().catch(() => {});
    await page.waitForTimeout(900);
  }
  await shot("apertura-resumen", "Apertura: resumen del sobre", "Apertura de sobres", { wait: 1200 });
});
await step("abrir-todos", async () => {
  await go(`${setHref}/todos`);
  await page.click('[data-testid="open-all"]');
  await page.waitForSelector('[data-testid="open-all-grid"] li', { timeout: 60_000 });
  await shot("abrir-todos", "Abrir todos de golpe", "Apertura de sobres", { wait: 1500, full: !phone });
});
await go("/coleccion");
await shot("mi-coleccion", "Mi colección", "Coleccionista");
await step("album", async () => {
  await page.locator('main a[href^="/coleccion/"]:not([href$="album"])').first().click();
  await page.waitForSelector('[data-testid="binder-grid"]');
  await shot("album", "Álbum de la colección", "Coleccionista", { wait: 1500 });
  await page.locator('[data-testid="binder-grid"] li:not([data-missing]) button').first().click();
  await page.waitForSelector('[data-testid="card-sheet"]');
  await shot("ficha-carta", "Ficha de una carta (con holo)", "Coleccionista", { wait: 1500 });
  await page.keyboard.press("Escape");
});
await go("/coleccion/album");
await shot("album-publico-ajustes", "Ajustes del álbum público", "Coleccionista", { full: !phone });
await step("album-publico", async () => {
  const url = await page.locator('[data-testid="album-url"]').inputValue();
  const anon = await browser.newPage(phone ? { ...devices["iPhone 14"], defaultBrowserType: undefined } : { viewport: { width: 1440, height: 900 } });
  await anon.goto(url);
  await anon.waitForLoadState("networkidle");
  await anon.waitForTimeout(1000);
  n += 1;
  const file = `${String(n).padStart(2, "0")}-album-publico.jpg`;
  await anon.screenshot({ path: path.join(dir, file), type: "jpeg", quality: 82, fullPage: !phone });
  shots.push({ file, title: "Álbum público (visitante)", section: "Coleccionista" });
  console.log(`✓ ${file}`);
  await anon.close();
});
await go("/recompensas");
await shot("recompensas", "Recompensas: sobre gratis y racha diaria", "Coleccionista");
await step("recompensa-reclamada", async () => {
  await page.locator('[data-testid="daily"] button:has-text("Reclamar")').click();
  await page.waitForSelector('[data-testid="toast"]');
  await shot("recompensa-reclamada", "Recompensa reclamada (aviso)", "Coleccionista", { wait: 500 });
});
await go("/cuenta");
await shot("mi-cuenta", "Mi cuenta", "Coleccionista", { full: !phone });
await step("confirmar-borrado", async () => {
  await page.click('[data-testid="delete-account"]');
  await page.waitForSelector('[data-testid="confirm-dialog"]');
  await shot("confirmar-borrado", "Confirmación con botón de peligro", "Coleccionista", { wait: 500 });
  await page.keyboard.press("Escape");
});

// ——— Administración ———
await step("admin", async () => {
  await page.click('[data-testid="demo-switch"]');
  await page.waitForURL(/\/admin/);
});
await shot("admin-resumen", "Panel: resumen", "Administración");
if (phone) {
  await openMenu();
  await shot("admin-menu", "Panel: menú (móvil)", "Administración", { wait: 500 });
  await page.keyboard.press("Escape");
}
await go("/admin/sets");
await shot("admin-colecciones", "Panel: colecciones", "Administración");
const adminSet = await page.locator('a[href^="/admin/sets/"]').filter({ hasText: "FA01" }).first().getAttribute("href");
await go(adminSet);
await shot("admin-coleccion", "Panel: una colección (probabilidades y cartas)", "Administración", { full: true, wait: 1500 });
await step("editor", async () => {
  await page.locator('[aria-label^="Editar carta"]').first().click();
  await page.waitForSelector('[data-testid="card-editor"]');
  await shot("admin-editor-carta", "Panel: editor de carta", "Administración", { wait: 1500 });
  await page.keyboard.press("Escape");
});
await step("archivar", async () => {
  await go(adminSet);
  await page.click('[data-testid="publish-panel"] button');
  await page.waitForSelector('[data-testid="confirm-dialog"]');
  await shot("admin-confirmar", "Panel: confirmación antes de archivar", "Administración", { wait: 500 });
  await page.keyboard.press("Escape");
});
await step("simulador", async () => {
  await go(`${adminSet}/simulate`);
  await page.waitForSelector(".pack__strip");
  await shot("admin-simulador", "Panel: simulador de sobres", "Administración", { wait: 1200 });
});
for (const [p, slug, title] of [
  ["/admin/characters", "admin-personajes", "Panel: personajes"],
  ["/admin/users", "admin-usuarios", "Panel: usuarios"],
  ["/admin/tiers", "admin-tiers", "Panel: tiers de Patreon"],
  ["/admin/metricas", "admin-metricas", "Panel: métricas y copias"],
  ["/admin/ajustes", "admin-ajustes", "Panel: ajustes (edad mínima)"],
]) {
  await go(p);
  await shot(slug, title, "Administración");
}
await step("ficha-usuario", async () => {
  await go("/admin/users?q=demo-collector");
  await page.locator('a[href^="/admin/users/"]').first().click();
  await page.waitForURL(/\/admin\/users\/.+/);
  await shot("admin-ficha-usuario", "Panel: ficha de un usuario", "Administración", { full: !phone });
});

// ——— Sistema de diseño ———
await go("/sistema");
await shot("sistema", "Sistema de diseño (catálogo)", "Sistema de diseño", { full: true, wait: 1200 });

writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ device, shots }, null, 2));
await browser.close();
console.log(`${shots.length} capturas en ${dir}`);
