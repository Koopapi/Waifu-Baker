// Barrido de calidad (no pertenece a una spec): cada página, con cada perfil y en escritorio,
// tableta y móvil, sin errores de consola, sin respuestas fallidas, sin desbordamiento lateral,
// sin imágenes rotas y con nombre accesible en botones y enlaces.
import type { Page } from "@playwright/test";
import { desktopOnly, expect, test } from "./fixtures";
import path from "node:path";
import { dictionaries } from "../src/i18n/index";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login } from "./helpers";

const VIEWPORTS = [
  { name: "escritorio", width: 1360, height: 950 },
  { name: "tableta", width: 820, height: 1180 },
  { name: "movil", width: 390, height: 844 },
];

interface Problem {
  page: string;
  viewport: string;
  issue: string;
}

function watch(page: Page, problems: Problem[], ctx: { url: string; vp: string }) {
  page.on("console", (m) => {
    // En /no-existe el propio documento es un 404 esperado.
    if (m.type() === "error" && !ctx.url.includes("no-existe") && !/Download the React DevTools|\[Fast Refresh\]|\[HMR\]/.test(m.text())) problems.push({ page: ctx.url, viewport: ctx.vp, issue: `consola: ${m.text().slice(0, 200)}` });
  });
  page.on("pageerror", (e) => problems.push({ page: ctx.url, viewport: ctx.vp, issue: `excepción: ${e.message.slice(0, 200)}` }));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.host === new URL(page.url() || "http://localhost:3200").host && r.status() >= 400 && !ctx.url.includes("no-existe"))
      problems.push({ page: ctx.url, viewport: ctx.vp, issue: `HTTP ${r.status()} ${u.pathname}` });
  });
}

async function audit(page: Page, url: string, vp: (typeof VIEWPORTS)[number], problems: Problem[], shotName: string) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    // Fuerza la carga de imágenes diferidas.
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  const found = await page.evaluate(() => {
    const out: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > window.innerWidth + 1) {
      const wide = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed")
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
      out.push(`desborde lateral (${root.scrollWidth}px > ${window.innerWidth}px): ${wide.join(", ")}`);
    }
    for (const img of document.querySelectorAll("img")) if (img.complete && img.naturalWidth === 0) out.push(`imagen rota: ${img.getAttribute("src")}`);
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href], [role=button]")) {
      // Nombre accesible: aria-label, aria-labelledby, <label for> (los controles del sistema de diseño), texto, title o alt.
      const labelledBy = (el.getAttribute("aria-labelledby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
      const forLabel = el.id ? (document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent ?? "") : "";
      const name = (el.getAttribute("aria-label") || labelledBy || forLabel || el.textContent || el.getAttribute("title") || el.querySelector("img")?.getAttribute("alt") || "").trim();
      if (!name && el.offsetParent !== null) out.push(`control sin nombre: ${el.outerHTML.slice(0, 120)}`);
    }
    // Los campos con aria-hidden son el reflejo oculto de los controles accesibles (Radix) para enviar formularios.
    for (const el of document.querySelectorAll<HTMLInputElement>('input:not([type=hidden]):not([aria-hidden="true"]), select, textarea')) {
      const labelled = el.getAttribute("aria-label") || el.labels?.length || el.getAttribute("placeholder") || el.getAttribute("title");
      if (!labelled && el.offsetParent !== null) out.push(`campo sin etiqueta: ${el.outerHTML.slice(0, 120)}`);
    }
    if (!document.querySelector("h1") && !document.querySelector(".stage")) out.push("sin h1");
    return out;
  });
  for (const issue of found) problems.push({ page: url, viewport: vp.name, issue });
  await page.screenshot({ path: `test-results/sweep/${shotName}-${vp.name}.png`, fullPage: true });
}

test("barrido de calidad de todas las páginas", async ({ browser }) => {
  desktopOnly();
  test.setTimeout(600_000);
  const problems: Problem[] = [];

  const admin = await login(browser, "admin-sweep", true);
  const setId = await createPublishedSet(admin, "QA1", ["01.webp", "02.webp", "03.webp", "04.webp"].map((f) => path.join(LAB, f)), 4, 50);
  const fan = await login(browser, "fan-sweep", false, "/sobres");
  await giftPacks(admin, "fan-sweep", "QA1", 4);
  await fan.goto("/sobres");
  await dismissCelebration(fan);
  await admin.goto("/admin/users?q=fan-sweep");
  await admin.click("a:text-is('fan-sweep')");
  const fanAdminUrl = new URL(admin.url()).pathname;

  // Abre dos sobres para que haya colección, y deja dos sellados para ver las páginas de apertura.
  await fan.goto(`/sobres/${setId}/todos`);
  await fan.evaluate(() => 0);
  const anon = await (await browser.newContext()).newPage();
  // Los datos se preparan con los textos en español; el barrido se hace en inglés, el idioma por defecto.
  const base = test.info().project.use.baseURL!;
  for (const p of [admin, fan, anon]) await p.context().addCookies([{ name: "wb_locale", value: "en", url: base }]);

  const ctxFor = (p: Page) => {
    const c = { url: "", vp: "" };
    watch(p, problems, c);
    return c;
  };
  const cAdmin = ctxFor(admin);
  const cFan = ctxFor(fan);
  const cAnon = ctxFor(anon);

  const run = async (p: Page, c: { url: string; vp: string }, url: string, name: string) => {
    for (const vp of VIEWPORTS) {
      c.url = url;
      c.vp = vp.name;
      await audit(p, url, vp, problems, name);
    }
  };

  await run(fan, cFan, "/sobres", "fan-sobres");
  await run(fan, cFan, `/sobres/${setId}`, "fan-abrir");
  await run(fan, cFan, `/sobres/${setId}/todos`, "fan-abrir-todos");
  await fan.setViewportSize({ width: 1360, height: 950 });
  await fan.goto(`/sobres/${setId}/todos`);
  await fan.click('[data-testid="open-all"]');
  await expect(fan.locator('[data-testid="open-all-grid"] li')).toHaveCount(8);
  await run(fan, cFan, "/sobres", "fan-sobres-vacio");
  await run(fan, cFan, "/coleccion", "fan-coleccion");
  await run(fan, cFan, `/coleccion/${setId}`, "fan-binder");
  await run(fan, cFan, "/coleccion/album", "fan-album-privado");
  await fan.setViewportSize({ width: 1360, height: 950 });
  await fan.goto("/coleccion/album");
  await fan.click(`text=${dictionaries.en.collection.album.activate}`);
  await expect(fan.locator('[data-testid="album-url"]')).toBeVisible();
  const albumUrl = new URL(await fan.locator('[data-testid="album-url"]').inputValue()).pathname;
  await run(fan, cFan, "/coleccion/album", "fan-album-ajustes");

  await run(anon, cAnon, "/", "anon-inicio");
  await run(anon, cAnon, "/login", "anon-login");
  await run(anon, cAnon, "/drop-rates", "anon-probabilidades");
  await run(anon, cAnon, albumUrl, "anon-album");
  await run(anon, cAnon, "/no-existe", "anon-404");
  await run(fan, cFan, "/", "fan-inicio");

  await run(admin, cAdmin, "/admin", "admin-inicio");
  await run(admin, cAdmin, "/admin/sets", "admin-colecciones");
  await run(admin, cAdmin, `/admin/sets/${setId}`, "admin-coleccion");
  await run(admin, cAdmin, `/admin/sets/${setId}/simulate`, "admin-simular");
  await run(admin, cAdmin, "/admin/characters", "admin-personajes");
  await run(admin, cAdmin, "/admin/tiers", "admin-tiers");
  await run(admin, cAdmin, "/admin/users", "admin-usuarios");
  await run(admin, cAdmin, fanAdminUrl, "admin-usuario");

  const unique = [...new Map(problems.map((p) => [`${p.page}|${p.viewport}|${p.issue}`, p])).values()];
  if (unique.length) console.log(unique.map((p) => `- [${p.viewport}] ${p.page}: ${p.issue}`).join("\n"));
  expect(unique, "problemas encontrados en el barrido").toEqual([]);
});
