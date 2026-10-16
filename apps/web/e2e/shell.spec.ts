// Criterios de la spec 010: estructura estilo Discord, acabado y edad mínima configurable.
import type { Page } from "@playwright/test";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";

const es = dictionaries.es;
const sh = es.common.shell;
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 768;

/** En móvil, las secciones están en el cajón: se abre antes de usarlas. */
async function openNav(page: Page) {
  if (!isPhone(page)) return;
  await page.click('[data-testid="menu-button"]');
  await expect(page.locator('[data-testid="app-drawer"]')).toHaveAttribute("data-open", "true");
}

test("estructura: barra, panel, cajón, pestañas, avisos, movimiento y edad mínima", async ({ browser }, info) => {
  test.setTimeout(300_000);
  const page = await (await browser.newContext()).newPage();
  page.on("dialog", (d) => d.accept());
  expect((await page.request.post("/api/demo/seed")).status()).toBe(200);
  await page.goto("/");
  await page.click('[data-testid="demo-enter-collector"]');
  await page.waitForURL(/\/sobres$/);
  const nav = page.locator('[data-testid="app-nav"]');

  await test.step("RF-1: la barra lleva el inicio y un icono por colección del usuario", async () => {
    await openNav(page);
    const rail = page.locator('[data-testid="collection-rail"]');
    await expect(rail.locator(`a[aria-label="${sh.home}"]`)).toBeVisible();
    await expect(rail.locator('a[href^="/coleccion/"]')).toHaveCount(1);
    await expect(rail.locator('a[href^="/coleccion/"] img')).toBeVisible();
  });

  await test.step("RF-2: el panel lista las secciones con la actual resaltada", async () => {
    for (const label of [es.common.nav.myPacks, es.common.nav.myCollection, sh.album, sh.rewards, es.common.nav.myAccount]) {
      await expect(nav.locator(`a:has-text("${label}")`).first()).toBeVisible();
    }
    await expect(nav.locator('a[aria-current="page"]')).toHaveText(new RegExp(es.common.nav.myPacks));
  });

  await test.step("RF-3: cambiar de sección no recarga la página completa", async () => {
    await page.evaluate(() => ((window as unknown as { __sameDocument: boolean }).__sameDocument = true));
    await nav.locator(`a:has-text("${es.common.nav.myCollection}")`).click();
    await page.waitForURL(/\/coleccion$/);
    await expect(page.locator('[data-testid="section-title"]')).toHaveText(es.common.nav.myCollection);
    expect(await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument)).toBe(true);
  });

  await test.step("RF-4 y RF-16: en móvil, cajón con botón y gesto, y barra de pestañas", async () => {
    const drawer = page.locator('[data-testid="app-drawer"]');
    const tabs = page.locator('[data-testid="tab-bar"]');
    if (!isPhone(page)) {
      await expect(tabs).toBeHidden();
      await expect(page.locator('[data-testid="menu-button"]')).toBeHidden();
      return;
    }
    await expect(drawer).toHaveAttribute("data-open", "false");
    await page.click('[data-testid="menu-button"]');
    await expect(drawer).toHaveAttribute("data-open", "true");
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveAttribute("data-open", "false");
    // Gesto: arrastrar desde el borde izquierdo.
    await page.mouse.move(4, 420);
    await page.mouse.down();
    await page.mouse.move(60, 422, { steps: 4 });
    await page.mouse.move(160, 424, { steps: 4 });
    await page.mouse.up();
    await expect(drawer).toHaveAttribute("data-open", "true");
    await page.keyboard.press("Escape");
    await expect(tabs).toBeVisible();
    await tabs.locator(`a:has-text("${sh.tabs.rewards}")`).click();
    await page.waitForURL(/\/recompensas$/);
    await expect(tabs.locator('a[aria-current="page"]')).toHaveText(new RegExp(sh.tabs.rewards));
  });

  await test.step("RF-8: al reclamar aparece un aviso que desaparece solo", async () => {
    await page.goto("/recompensas");
    await page.locator('[data-testid="free-pack"] button').click();
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-kind", "success");
    await expect(toast).toBeHidden({ timeout: 8_000 });
  });

  await test.step("RF-7 y RF-10: estados al pasar el ratón y animaciones según el movimiento reducido", async () => {
    await page.goto("/sobres");
    const section = page.locator(".section-in").first();
    const duration = await section.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    if (info.project.name === "reduced-motion") expect(duration).toBeLessThan(0.01);
    else expect(duration).toBeGreaterThan(0.1);
    if (!isPhone(page)) {
      const link = nav.locator(`a:has-text("${sh.album}")`);
      const before = await link.evaluate((el) => getComputedStyle(el).backgroundColor);
      await link.hover();
      await expect.poll(() => link.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
    }
  });

  await test.step("RF-11: se navega con teclado y el foco se ve", async () => {
    await page.goto("/sobres");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el && el !== document.body ? getComputedStyle(el).outlineStyle : "none";
    });
    expect(outline).not.toBe("none");
  });

  await test.step("RF-5: el panel de administración usa la misma estructura", async () => {
    await page.click('[data-testid="demo-switch"]');
    await page.waitForURL(/\/admin$/);
    await openNav(page);
    await expect(page.locator('[data-testid="collection-rail"] a[href^="/admin/sets/"]')).toHaveCount(1);
    await expect(nav.locator('a[aria-current="page"]')).toHaveText(new RegExp(es.admin.nav.overview));
    for (const label of [es.admin.nav.sets, es.admin.nav.characters, es.admin.nav.users, es.admin.nav.settings]) {
      await expect(nav.locator(`a:has-text("${label}")`).first()).toBeVisible();
    }
  });

  await test.step("RF-17 y RF-19: el administrador sube la edad mínima a 18 y los textos la muestran", async () => {
    await page.goto("/admin/ajustes");
    await expect(page.locator('[data-testid="min-age-current"]')).toHaveText(es.admin.settings.minAge.current(16));
    await page.locator('[data-testid="min-age-form"] label:has-text("18+")').click();
    await page.locator(`[data-testid="min-age-form"] button:has-text("${es.admin.settings.minAge.save}")`).click();
    await expect(page.locator('[data-testid="min-age-current"]')).toHaveText(es.admin.settings.minAge.current(18));
    await page.goto("/legal/terms");
    await expect(page.locator('[data-testid="legal-terms"]')).toContainText("18");
  });

  await test.step("RF-18: el coleccionista que confirmó 16 debe confirmar 18 para seguir", async () => {
    await page.goto("/admin");
    await page.click('[data-testid="demo-switch"]');
    await page.waitForURL(/\/bienvenida/);
    await expect(page.locator(`text=${es.legal.gate.ageRaised(18)}`)).toBeVisible();
    await expect(page.locator(`text=${es.legal.gate.age(18)}`)).toBeVisible();
    await page.check('[data-testid="gate-form"] input[name="age"]');
    await page.check('[data-testid="gate-form"] input[name="terms"]');
    await page.click('[data-testid="gate-form"] button');
    await page.waitForURL(/\/sobres$/);
  });
});
