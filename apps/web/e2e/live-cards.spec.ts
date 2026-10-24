// Criterios de la spec 018 (las cartas por capas se ven en toda la web): carta viva al revelarla, imagen fija en la
// bandeja y el resumen, enlaces de capas solo para quien tiene la carta, movimiento reducido.
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login, tear } from "./helpers";

test("cartas por capas: revelación viva", async ({ browser }) => {
  const reduced = test.info().project.name === "reduced-motion";
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const fan = await login(browser, `viva-${tag}`, false, "/sobres");
  const admin = await login(browser, `admin-viva-${tag}`, true);
  const code = `LV${tag.slice(0, 4).toUpperCase()}`;
  await createPublishedSet(admin, code, ["07.webp", "08.webp"].map((f) => path.join(LAB, f)), 2);
  await giftPacks(admin, `viva-${tag}`, code, 1);

  let layerUrl = "";
  await test.step("RF-6 y RF-14: al revelar la carta se ve viva (con movimiento reducido, la imagen fija)", async () => {
    await fan.goto("/sobres");
    await dismissCelebration(fan);
    await fan.click(`[data-testid="group-${code}"] >> text=Abrir un sobre`);
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="fanned"]')).toBeVisible();
    await fan.locator('.card3d[role="button"]').first().click();
    const live = fan.locator(".card3d__live .cc-card");
    if (reduced) {
      await expect(fan.locator('.stage[data-revealed="1"]')).toBeVisible();
      await expect(fan.locator(".card3d__live")).toHaveCount(0);
      return;
    }
    await expect(live).toBeVisible();
    // Sus capas cargan (enlaces firmados de la carta) y hace su entrada.
    const img = fan.locator(".card3d__live .cc-capa img").first();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect(live).toHaveClass(/cc-entra/);
    layerUrl = (await img.getAttribute("src"))!;
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}-revelacion-viva.png` });
    expect(layerUrl).toMatch(/^\/api\/cards\/layer\?c=.+&k=.+&e=\d+&sig=[0-9a-f]{64}$/);
  });

  await test.step("RF-8: en la bandeja y en el resumen, la imagen fija", async () => {
    await expect(fan.locator('.stage[data-revealed="1"]')).toBeVisible();
    await expect(fan.locator(".card3d__live")).toHaveCount(0);
    await fan.locator('.card3d[role="button"]').first().click();
    await expect(fan.locator(".summary")).toBeVisible();
    await expect(fan.locator(".summary__thumb img").first()).toHaveAttribute("src", /\/api\/cards\/img\?/);
  });

  if (!reduced) {
    await test.step("RF-16: el enlace de una capa no sirve con la sesión de otra persona", async () => {
      expect((await fan.request.get(layerUrl)).status()).toBe(200);
      expect((await admin.request.get(layerUrl)).status()).toBe(404);
    });
  }
});
