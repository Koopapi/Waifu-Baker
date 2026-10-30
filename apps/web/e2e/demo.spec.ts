// Criterios de la spec 010: demo local (portada con los dos papeles, franja y cambio de papel).
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { dismissCelebration } from "./helpers";

const es = dictionaries.es;

test("demo: portada con papeles, coleccionista y cambio a administrador", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();

  await test.step("RF-12: la demo se llena con su colección, el coleccionista y el administrador", async () => {
    const r = await page.request.post("/api/demo/seed");
    expect(r.status()).toBe(200);
    // Spec 017, RF-20: las 10 del manifiesto y la de Yuki (chica recortada) del paquete de Bruno, todas armadas.
    expect(await r.json()).toMatchObject({ seeded: true, cards: 11 });
    // Una segunda vez no duplica nada.
    expect((await page.request.post("/api/demo/seed")).status()).toBe(409);
  });

  await test.step("RF-13: la portada ofrece los dos papeles y entra sin Patreon", async () => {
    await page.goto("/");
    await expect(page.locator(`text=${es.site.demo.enterCollector}`)).toBeVisible();
    await expect(page.locator(`text=${es.site.demo.enterAdmin}`)).toBeVisible();
    await page.click('[data-testid="demo-enter-collector"]');
    await page.waitForURL(/\/packs$/);
    // Spec 015, RF-6: los 3 sobres de muestra se celebran como regalo la primera vez que entra.
    const celebration = page.locator('[data-testid="celebration-dialog"]');
    await expect(celebration).toBeVisible();
    await expect(celebration).toContainText(es.rewards.fx.arrivals.title(3));
    await dismissCelebration(page);
    await expect(page.locator('[data-testid="group-FA01"] >> text=x3')).toBeVisible();
    await expect(page.locator('[data-testid="cookie-balance"]')).toContainText("240");
  });

  await test.step("RF-14: la franja indica el papel y permite cambiarlo", async () => {
    const banner = page.locator('[data-testid="demo-banner"]');
    await expect(banner).toBeVisible();
    await page.click('[data-testid="demo-switch"]');
    await page.waitForURL(/\/admin$/);
    await expect(page.locator('[data-testid="demo-switch"]')).toContainText(es.site.demo.roles.collector);
    await page.click('[data-testid="demo-switch"]');
    await page.waitForURL(/\/packs$/);
  });
});
