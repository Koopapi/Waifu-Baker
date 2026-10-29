// Criterios de finalización de la spec 008: un visitante ve la web en inglés → cambia a español desde
// la cabecera → la misma página aparece en español → el idioma se mantiene al navegar → el panel y un
// error de validación aparecen en el idioma elegido.
import type { Browser, Page } from "@playwright/test";
import path from "node:path";
import { translateError } from "../src/i18n/errors";
import { formatDate } from "../src/i18n/format";
import { dictionaries } from "../src/i18n/index";
import { DESKTOP, expect, test } from "./fixtures";
import { LAB, acceptGate, createPublishedSet, dismissCelebration, giftPacks, login, untickAdmin, openAllAndSkip } from "./helpers";

const en = dictionaries.en;
const es = dictionaries.es;
const NO_COOKIES = { cookies: [], origins: [] };

/** Visitante sin idioma elegido (el resto de E2E fija español). */
const fresh = async (browser: Browser, opts = {}) => (await browser.newContext({ storageState: NO_COOKIES, ...opts })).newPage();

async function loginEnglish(page: Page, name: string, admin: boolean, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.fill('input[name="name"]', name);
  if (!admin) await untickAdmin(page);
  await page.click(`text=${en.site.login.devSubmit}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.waitForLoadState("networkidle");
  await acceptGate(page);
}

const toggle = (p: Page, l: "en" | "es") => p.locator(`[data-testid="locale-toggle"] button[lang="${l}"]`);

test("idiomas: inglés por defecto y cambio a español en toda la web", async ({ browser }) => {
  // Recorre web, panel y álbum: en WebKit pasa de los 3 minutos por defecto.
  test.setTimeout(300_000);
  const anon = await fresh(browser);

  await test.step("RF-1 y RF-7: sin elegir idioma, la web está en inglés y lo declara", async () => {
    await anon.goto("/");
    await expect(anon.locator("html")).toHaveAttribute("lang", "en");
    await expect(anon.locator(`text=${en.site.home.tagline}`)).toBeVisible();
  });

  await test.step("RF-2: el selector está en las páginas públicas", async () => {
    for (const p of ["/", "/login", "/drop-rates", "/no-existe"]) {
      await anon.goto(p);
      await expect(anon.locator('[data-testid="locale-toggle"]')).toBeVisible();
    }
  });

  await test.step("RF-5: la página 404 también se traduce", async () => {
    await anon.goto("/no-existe");
    await expect(anon.locator("h1")).toHaveText(en.site.notFound.heading);
  });

  await test.step("RF-3 y RF-4: cambiar a español mantiene la página y se recuerda un año", async () => {
    await anon.goto("/drop-rates");
    await expect(anon.locator("h1")).toHaveText(en.site.dropRates.heading);
    await toggle(anon, "es").click();
    await expect(anon.locator("h1")).toHaveText(es.site.dropRates.heading);
    await expect(anon).toHaveURL(/\/drop-rates$/);
    await expect(anon.locator("html")).toHaveAttribute("lang", "es");
    const cookie = (await anon.context().cookies()).find((c) => c.name === "wb_locale");
    expect(cookie?.value).toBe("es");
    expect(cookie!.expires * 1000).toBeGreaterThan(Date.now() + 300 * 24 * 3600 * 1000);
    await anon.goto("/");
    await expect(anon.locator(`text=${es.site.home.tagline}`)).toBeVisible();
    await toggle(anon, "en").click();
    await expect(anon.locator(`text=${en.site.home.tagline}`)).toBeVisible();
  });

  // Datos: una colección publicada hoy (panel en español, como el resto de E2E) y un fan con 2 de 4 cartas.
  const adminEs = await login(browser, "admin-i18n", true);
  await createPublishedSet(adminEs, "I18N", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);

  await test.step("RF-6: las fechas siguen el idioma", async () => {
    await anon.goto("/drop-rates");
    await expect(anon.locator("main")).toContainText(formatDate("en", new Date()));
    await toggle(anon, "es").click();
    await expect(anon.locator("main")).toContainText(formatDate("es", new Date()));
    await toggle(anon, "en").click();
    await expect(anon.locator("h1")).toHaveText(en.site.dropRates.heading);
  });

  await test.step("RF-5 y RF-3: el panel y sus errores en inglés; al cambiar, sigue en la misma página", async () => {
    const admin = await fresh(browser, DESKTOP);
    await loginEnglish(admin, "admin-i18n-en", true, "/admin/characters");
    await expect(admin.locator('[data-testid="app-nav"]')).toContainText(en.admin.nav.characters);
    await admin.fill(`form:has-text("${en.admin.characters.new}") input[name="name"]`, "!!!");
    await admin.click(`text=${en.admin.characters.create}`);
    await expect(admin.locator(`text=${translateError(en, { code: "invalid_name", params: { reason: "no_alnum" } })}`)).toBeVisible();
    await toggle(admin, "es").click();
    await expect(admin.locator('[data-testid="app-nav"]')).toContainText(es.admin.nav.characters);
    await expect(admin).toHaveURL(/\/admin\/characters$/);
    await expect(admin.locator("html")).toHaveAttribute("lang", "es");
  });

  // El fan (español por defecto) consigue 2 de 4 cartas (la 4.ª, legendaria, solo sale en los gold) y publica su álbum.
  const fan = await login(browser, "fan-i18n", false, "/sobres");
  await giftPacks(adminEs, "fan-i18n", "I18N", 1);
  await fan.goto("/sobres");
  await dismissCelebration(fan);
  const href = await fan.locator('[data-testid="group-I18N"] >> text=Abrir un sobre').getAttribute("href");
  await fan.goto(`${href}/todos`);
  expect(await openAllAndSkip(fan)).toBe(2);

  await test.step("RF-3 y RF-9: el coleccionista cambia a inglés; los nombres de las cartas no se traducen", async () => {
    await fan.goto("/coleccion");
    await expect(fan.locator("h1")).toHaveText(es.collection.title);
    await toggle(fan, "en").click();
    await expect(fan.locator("h1")).toHaveText(en.collection.title);
    await fan.click('[data-testid="collection-I18N"] a');
    await expect(fan.locator('[data-testid="binder-progress"]')).toHaveText(en.collection.progress(2, 3));
    await expect(fan.locator('[data-testid="binder-grid"] img[alt="I18N carta 003"]')).toHaveCount(1);
  });

  await test.step("RF-8: el álbum público sale en el idioma de quien lo visita", async () => {
    await fan.goto("/coleccion/album");
    await fan.click(`text=${en.collection.album.activate}`);
    await expect(fan.locator('[data-testid="album-url"]')).toBeVisible();
    const url = await fan.locator('[data-testid="album-url"]').inputValue();
    await anon.goto(url);
    await expect(anon.locator("html")).toHaveAttribute("lang", "en");
    await expect(anon.locator('[data-testid="album-totals"]')).toHaveText(en.collection.publicAlbum.totals(2, 4, 50));
    await expect(anon.locator('img[alt="I18N carta 003"]')).toHaveCount(1);
    await toggle(anon, "es").click();
    await expect(anon.locator('[data-testid="album-totals"]')).toHaveText(es.collection.publicAlbum.totals(2, 4, 50));
    await expect(anon.locator('img[alt="I18N carta 003"]')).toHaveCount(1);
    const og = await anon.locator('meta[property="og:image"]').getAttribute("content");
    expect((await anon.request.get(og!)).status()).toBe(200);
  });
});
