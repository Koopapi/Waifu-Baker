// Criterios de la spec 018 (las cartas por capas se ven en toda la web): carta viva al revelarla, imagen fija en la
// bandeja y el resumen, enlaces de capas solo para quien tiene la carta, movimiento reducido.
import path from "node:path";
import { desktopOnly, expect, test } from "./fixtures";
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

  await test.step("RF-7, RF-11 y RF-14: la ficha muestra la carta viva; el interruptor del giroscopio solo en el teléfono", async () => {
    await fan.goto("/coleccion");
    await fan.click(`[data-testid="collection-${code}"] a`);
    await fan.click('[aria-label="Ver carta 001"]');
    const art = fan.locator('[data-testid="card-sheet-art"]');
    if (reduced) {
      await expect(art.locator('[data-testid="card-sheet-flat"]')).toBeVisible();
      await expect(art.locator(".cc-card")).toHaveCount(0);
      return;
    }
    await expect(art.locator(".cc-card")).toBeVisible();
    const mobile = test.info().project.name !== "chromium-desktop";
    await expect(fan.locator('[data-testid="gyro"]')).toHaveCount(mobile ? 1 : 0);
    if (mobile) {
      // RF-12: con el permiso de los sensores concedido, se activa al momento.
      if (test.info().project.name === "pixel-7") await fan.context().grantPermissions(["accelerometer", "gyroscope"]);
      const sw = fan.locator('[data-testid="gyro"]').getByRole("switch");
      await sw.click();
      await expect(sw).toHaveAttribute("aria-checked", "true");
      await sw.click();
      await expect(sw).toHaveAttribute("aria-checked", "false");
    }
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}-ficha-viva.png` });
  });
});

test("cartas por capas: permiso del giroscopio negado", async ({ browser }) => {
  test.skip(!["pixel-7", "iphone-14"].includes(test.info().project.name), "Solo en los teléfonos");
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const fan = await login(browser, `giro-${tag}`, false, "/sobres");
  // Como en iOS: el permiso se pide y se niega.
  await fan.addInitScript(() => {
    (window.DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission = async () => "denied";
  });
  const admin = await login(browser, `admin-giro-${tag}`, true);
  const code = `GN${tag.slice(0, 4).toUpperCase()}`;
  await createPublishedSet(admin, code, ["09.webp", "11.webp"].map((f) => path.join(LAB, f)), 2);
  await giftPacks(admin, `giro-${tag}`, code, 1);
  await fan.goto("/sobres");
  await dismissCelebration(fan);
  await fan.click(`[data-testid="group-${code}"] >> text=Abrir un sobre`);
  await tear(fan);
  for (let i = 1; i <= 2; i++) {
    await fan.locator('.card3d[role="button"]').first().click();
    if (i < 2) await expect(fan.locator(`.stage[data-revealed="${i}"]`)).toBeVisible();
  }
  await expect(fan.locator(".summary")).toBeVisible();

  await test.step("RF-13: si se niega el permiso, el interruptor queda apagado y avisa", async () => {
    await fan.goto("/coleccion");
    await fan.click(`[data-testid="collection-${code}"] a`);
    await fan.click('[aria-label="Ver carta 001"]');
    const sw = fan.locator('[data-testid="gyro"]').getByRole("switch");
    await sw.click();
    await expect(fan.locator('[data-testid="gyro-denied"]')).toContainText("No diste permiso");
    await expect(sw).toHaveAttribute("aria-checked", "false");
  });
});

test("cartas por capas: cambios 18+ pendientes de revisión", async ({ browser }) => {
  desktopOnly();
  const admin = await login(browser, "admin-pendiente", true);
  const setId = await createPublishedSet(admin, "PEND1", ["03.webp", "04.webp"].map((f) => path.join(LAB, f)), 2, undefined, true);
  const openEditor = async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await admin.click('[aria-label="Editar carta 001"]');
    await expect(admin.locator('[data-testid="layers-editor"]')).toBeVisible();
  };
  const addParticlesAndSave = async () => {
    await openEditor();
    await admin.locator('[data-testid="layers-editor"]').getByRole("button", { name: "Añadir partículas" }).click();
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("pendiente de revisión 18+");
  };

  await test.step("RF-18 y RF-21: el cambio queda pendiente y el panel lo avisa con enlace a la carta", async () => {
    await addParticlesAndSave();
    await admin.goto(`/admin/sets/${setId}`);
    const warn = admin.locator('[data-testid="pending-layers"]');
    await expect(warn).toContainText("1 carta tiene cambios de capas pendientes de revisión 18+");
    await expect(warn.locator('a[href="#carta-001"]')).toBeVisible();
  });

  await test.step("RF-19: aprobarlo lo pasa a vigente y el aviso desaparece", async () => {
    await admin.click('[aria-label="Editar carta 001"]');
    const box = admin.locator('[data-testid="pending-layers-review"]');
    await expect(box).toContainText("Vigente (la ven los coleccionistas)");
    await box.locator('[data-testid="approve-pending-layers"]').click();
    await expect(admin.locator('[data-testid="pending-layers-review"]')).toHaveCount(0);
    await admin.goto(`/admin/sets/${setId}`);
    await expect(admin.locator('[data-testid="pending-layers"]')).toHaveCount(0);
  });

  await test.step("RF-20: descartar un cambio pendiente deja la carta como estaba", async () => {
    await addParticlesAndSave();
    await admin.goto(`/admin/sets/${setId}`);
    await admin.click('[aria-label="Editar carta 001"]');
    await admin.locator('[data-testid="discard-pending-layers"]').click();
    await expect(admin.locator("text=Cambio descartado")).toBeVisible();
    await admin.goto(`/admin/sets/${setId}`);
    await expect(admin.locator('[data-testid="pending-layers"]')).toHaveCount(0);
  });
});
