// Criterios de finalización de la spec 029 (vínculo de personaje y reciclaje): el administrador ajusta el coste de
// fabricar → el coleccionista abre sobres con repetidas → recicla todas las de un personaje con la confirmación → el
// vínculo sube de nivel → la carta se ve con el destello → fabrica con polvo la carta que le falta.
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, go, login, openAllAndSkip } from "./helpers";

test("vínculo de personaje, reciclaje y fabricar", async ({ browser }) => {
  test.setTimeout(300_000);
  const reduced = test.info().project.name === "reduced-motion";
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const code = `VI${tag.slice(0, 4).toUpperCase()}`;
  const fanName = `fan-vi-${tag}`;
  const fan = await login(browser, fanName, false, "/packs");
  const admin = await login(browser, `admin-vi-${tag}`, true);
  // 001 común (ranura 1) y 002 rara (ranura 2); la 003, legendaria, solo sale en los gold y falta.
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);
  await giftPacks(admin, fanName, code, 7);
  let lineUrl = "";

  await test.step("RF-22: el administrador baja el coste de fabricar una Legendaria", async () => {
    await admin.goto("/admin/settings");
    const form = admin.locator('[data-testid="bond-settings-form"]');
    await form.locator('input[data-testid="bond-cost-legendary"]').fill("50");
    await form.locator('[data-testid="bond-settings-save"]').click();
    await expect(form.getByText("Valores del vínculo guardados.")).toBeVisible();
  });

  await test.step("RF-23: el simulador da los días al nivel 10", async () => {
    await admin.locator('[data-testid="bond-sim-run"]').click();
    await expect(admin.locator('[data-testid="bond-sim-result"]')).toContainText("Gratuito:");
  });

  await fan.goto("/packs");
  await dismissCelebration(fan);
  // «Mis sobres» marca los sobres como vistos y se refresca sola.
  await go(fan, `/packs/${setId}/all`);
  expect(await openAllAndSkip(fan)).toBe(14);

  await test.step("RF-15 y RF-17: desde la ficha se llega a la línea del personaje con su vínculo y su polvo", async () => {
    await fan.goto(`/collection/${setId}`);
    await fan.click('[aria-label="Ver carta 002"]');
    const sheet = fan.locator('[data-testid="card-sheet"]');
    await expect(sheet).toBeVisible();
    await sheet.locator('[data-testid="card-character-link"]').click();
    await fan.waitForURL(/\/collection\/character\/[0-9a-f-]{36}$/);
    lineUrl = fan.url();
    await expect(fan.locator('[data-testid="character-name"]')).toHaveText(`Personaje ${code}`);
    await expect(fan.locator('[data-testid="bond-level"]')).toHaveText("Nivel 1");
    await expect(fan.locator('[data-testid="card-line-item"]')).toHaveCount(3);
    await expect(fan.locator('[data-testid="card-line-item"][data-owned="false"]')).toHaveCount(1);
    await expect(fan.locator('[data-testid="dust-balance"]')).toContainText("0 de polvo");
  });

  await test.step("RF-4, RF-5 y RF-2: reciclar todas las repetidas pide confirmación con lo que dan y sube el vínculo", async () => {
    await fan.locator('[data-testid="recycle-all"]').click();
    const dialog = fan.locator('[data-testid="recycle-dialog"]');
    await expect(dialog).toBeVisible();
    const summary = dialog.locator('[data-testid="gain-summary"]');
    // 6 comunes (10 puntos, 2,5 de polvo) y 6 raras (25 puntos, 7,5 de polvo).
    await expect(summary).toContainText("12");
    await expect(summary).toContainText("+210");
    await expect(summary).toContainText("+60");
    await expect(summary).toContainText("1 → 3");
    await dialog.locator('[data-testid="recycle-confirm"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(fan.locator('[data-testid="bond-level"]')).toHaveText("Nivel 3");
    await expect(fan.locator('[data-testid="bond-title"]')).toHaveText("Amiga");
    await expect(fan.locator('[data-testid="dust-balance"]')).toContainText("60 de polvo");
    // RF-1: cada versión conserva su copia.
    await expect(fan.locator('[data-testid="line-owned"]').first()).toHaveText("x1");
    await expect(fan.locator('[data-testid="recycle-all"]')).toBeDisabled();
  });

  await test.step("RF-9: en el nivel 3 la carta viva lleva el destello sobre la chica", async () => {
    await fan.goto(`/collection/${setId}`);
    await fan.click('[aria-label="Ver carta 002"]');
    const sheet = fan.locator('[data-testid="card-sheet"]');
    await expect(sheet.locator('[data-testid="card-bond"]')).toContainText("3");
    // Con movimiento reducido la ficha enseña la imagen fija.
    if (!reduced) await expect(sheet.locator(".cc-brillo-destello")).toHaveCount(1);
  });

  await test.step("RF-18 y RF-21: fabricar la legendaria que falta con el polvo", async () => {
    await fan.goto(lineUrl);
    await fan.locator('[data-testid="craft-card"]').click();
    await fan.locator('[data-testid="confirm-accept"]').click();
    await expect(fan.locator('[data-testid="card-line-item"][data-owned="false"]')).toHaveCount(0);
    await expect(fan.locator('[data-testid="dust-balance"]')).toContainText("10 de polvo");
  });
});
