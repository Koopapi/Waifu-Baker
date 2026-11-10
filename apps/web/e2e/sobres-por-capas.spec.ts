// Criterios de finalización de la spec 030: el administrador diseña el sobre gold con el ejemplo FA01 del paquete de diseño, lo
// guarda y recarga (las imágenes siguen) → la revisión avisa de una capa mal medida → «Mis sobres» muestra el gold con
// su diseño y el plata con el sobre básico → el coleccionista lo abre (rasgando o con el botón) con una Legendaria:
// las cartas suben boca abajo, el mazo late, sale el efecto especial y el resumen «Tu sobre».
import path from "node:path";
import { dictionaries } from "../src/i18n/index";
import { adminPacksDictionaries } from "../src/i18n/admin-packs";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login, revealTop, tear } from "./helpers";

const es = dictionaries.es;
const ap = adminPacksDictionaries.es;
const shot = (page: import("@playwright/test").Page, name: string) => page.screenshot({ path: `test-results/screens/${test.info().project.name}/s030-${name}.png` });

test("sobres por capas: diseñar, guardar, recargar y abrir con una Legendaria", async ({ browser }) => {
  test.setTimeout(420_000);
  const project = test.info().project.name;
  const reduced = project === "reduced-motion";
  const tag = project.replace(/[^a-z0-9]/g, "");
  const code = `SB${tag.slice(0, 4).toUpperCase()}`;
  const fanName = `fan-sb-${tag}`;
  const fan = await login(browser, fanName, false, "/packs");
  const admin = await login(browser, `admin-sb-${tag}`, true);
  // Sobres de 2 cartas; el gold (tabla toda legendaria) trae dos Legendarias.
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);

  await test.step("RF-1, RF-2, RF-3 y RF-8: el editor del sobre gold con la vista previa y los datos de la colección", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await expect(admin.locator('[data-testid="pack-design-gold"]')).toBeVisible();
    await expect(admin.locator('[data-testid="pack-design-silver"]')).toBeVisible();
    await admin.click('[data-testid="pack-design-edit-gold"]');
    await admin.waitForURL(/\/pack\/gold$/);
    await expect(admin.getByRole("heading", { name: new RegExp(ap.title) })).toBeVisible();
    await expect(admin.locator('[data-testid="pack-preview"] .sc-sobre')).toBeVisible();
    // RF-8: nombre, código y cartas vienen de la colección y no se editan.
    const data = admin.locator('[data-testid="pack-data"]');
    await expect(data.getByLabel(ap.setCode)).toHaveValue(code);
    await expect(data.getByLabel(ap.setCode)).toBeDisabled();
    await expect(data.getByLabel(ap.setCards)).toHaveValue("2");
  });

  await test.step("RF-4 a RF-7: cargar el ejemplo FA01, ajustar una capa, la insignia y el patrón de los sellos", async () => {
    await admin.click('[data-testid="pack-example"]');
    await expect(admin.locator('[data-testid="pack-layer"]')).toHaveCount(4);
    // Las capas que pone el código, bloqueadas.
    await expect(admin.locator('[data-testid="pack-fixed-layer"]').first()).toContainText(ap.byCode);
    // RF-5: abrir una capa y cambiar su profundidad.
    const row = admin.locator('[data-testid="pack-layer"]', { hasText: "sobre_fa01_personaje.webp" });
    await row.getByRole("button", { name: /sobre_fa01_personaje/ }).first().click();
    await expect(row.locator('[data-testid="layer-depth"]')).toBeVisible();
    // RF-6: una capa de partículas más.
    await admin.click('[data-testid="pack-add-particles"]');
    await expect(admin.locator('[data-testid="pack-layer"]')).toHaveCount(5);
    // RF-7: insignia y patrón holo de los sellos.
    await admin.locator('[data-testid="pack-badge"]').check();
    await admin.locator('[data-testid="pack-badge-text"]').fill("Edición gold");
    await admin.locator('[data-testid="pack-seal-pattern"]').getByRole("radio", { name: ap.patternNames.liquido }).click();
    await expect(admin.locator('[data-testid="pack-json"]')).toContainText("Edición gold");
    await expect(admin.locator('[data-testid="pack-json"]')).toContainText("/sobres/patrones/liquido.webp");
    await expect(admin.locator('[data-testid="pack-preview"] .sc-insignia').first()).toContainText("Edición gold");
    await shot(admin, "1-editor");
  });

  await test.step("RF-3: probar la apertura con cartas de muestra, pasar a la siguiente y volver a cerrar", async () => {
    await admin.click('[data-testid="pack-test"]');
    await expect(admin.locator('[data-testid="pack-test-next"]')).toBeVisible({ timeout: 10_000 });
    await expect(admin.locator('[data-testid="pack-indication"]')).toContainText("1 de 2");
    await admin.click('[data-testid="pack-test-next"]');
    await expect(admin.locator('[data-testid="pack-indication"]')).toContainText("2 de 2");
    await admin.click('[data-testid="pack-test-close"]');
    await expect(admin.locator('[data-testid="pack-test"]')).toBeVisible();
  });

  await test.step("RF-9: la revisión avisa de una capa de 800 × 1200 y no impide guardar", async () => {
    await admin.locator('[data-testid="pack-upload"]').setInputFiles(path.resolve(__dirname, "../../../docs/waifu-baker/sobres/pruebas/capa-800x1200.png"));
    const review = admin.locator('[data-testid="pack-review"]');
    await expect(review.locator('[data-kind="size"]')).toContainText("800 × 1200");
    // Se quita (el guardado de abajo no la lleva).
    const extra = admin.locator('[data-testid="pack-layer"]', { hasText: "capa-800x1200.png" });
    await extra.locator('[data-testid="pack-layer-remove"]').click();
    await expect(admin.locator('[data-testid="pack-layer"]')).toHaveCount(5);
  });

  await test.step("RF-10 y RF-11: guardar, recargar y el diseño vuelve con sus imágenes", async () => {
    await admin.click('[data-testid="pack-save"]');
    await expect(admin.locator('[data-testid="save-status"]')).toHaveAttribute("data-state", "saved", { timeout: 30_000 });
    await admin.reload();
    await expect(admin.locator('[data-testid="pack-layer"]')).toHaveCount(5);
    const thumb = admin.locator('[data-testid="pack-layer"]', { hasText: "sobre_fa01_fondo.webp" }).locator("img");
    await expect.poll(() => thumb.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1000);
    await expect(admin.locator('[data-testid="pack-review"] [data-kind="missing_file"]')).toHaveCount(0);
    await expect(admin.locator('[data-testid="pack-badge-text"]')).toHaveValue("Edición gold");
    await admin.goto(`/admin/sets/${setId}`);
    await expect(admin.locator('[data-testid="pack-design-gold"]')).toHaveAttribute("data-designed", "true");
    await expect(admin.locator('[data-testid="pack-design-silver"]')).not.toHaveAttribute("data-designed", "true");
  });

  await test.step("RF-13: un coleccionista no puede abrir el editor", async () => {
    const res = await fan.goto(`/admin/sets/${setId}/pack/gold`);
    expect(res?.status()).toBe(404);
  });

  await test.step("RF-14 a RF-16: «Mis sobres» muestra el gold con su diseño y el plata con el sobre básico", async () => {
    await giftPacks(admin, fanName, code, 1, "gold");
    await giftPacks(admin, fanName, code, 1, "silver");
    await fan.goto("/packs");
    await dismissCelebration(fan);
    const gold = fan.locator(`[data-testid="group-${code}-gold"] [data-testid="pack-thumb"]`);
    await expect(gold).toHaveAttribute("data-designed", "true");
    await expect(gold.locator("img")).toHaveAttribute("src", /pack-asset\?t=gold/);
    await expect.poll(() => gold.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(500);
    const silver = fan.locator(`[data-testid="group-${code}"] [data-testid="pack-thumb"]`);
    await expect(silver).not.toHaveAttribute("data-designed", "true");
    await expect(silver.locator("img")).toBeVisible();
    await shot(fan, "2-mis-sobres");
  });

  await test.step("RF-17 y RF-18: el sobre diseñado, cerrado sin cartas a la vista, se abre con la animación del paquete de diseño", async () => {
    await fan.click(`[data-testid="group-${code}-gold"] >> text=${es.packs.mine.openOne}`);
    const pack = fan.locator('[data-testid="tear-pack"][data-designed="true"][data-kind="gold"]');
    await expect(pack.locator(".sc-sobre")).toBeVisible();
    await expect(pack.locator(".sc-insignia").first()).toContainText("Edición gold");
    // RF-17: con el sobre cerrado no hay ninguna carta (el servidor decide al abrir).
    await expect(fan.locator(".card3d")).toHaveCount(0);
    await shot(fan, "3-sobre-cerrado");
    await tear(fan);
    // RF-18: la tira sale (el sobre queda abierto) y se pide el contenido.
    await expect(fan.locator('.stage[data-phase="opening"], .stage[data-phase="deck"]').first()).toBeVisible();
  });

  await test.step("RF-19, RF-20, RF-21 y RF-22: el mazo queda listo, late antes de la Legendaria y sale con el efecto especial", async () => {
    await expect(fan.locator('.stage[data-phase="deck"]')).toBeVisible({ timeout: 15_000 });
    // RF-19: el sobre se fue y las cartas están boca abajo, derechas, y solo se ve la de arriba (RF-20).
    await expect(fan.locator('[data-testid="tear-pack"]')).toHaveCount(0);
    await expect(fan.locator('.card3d[role="button"]')).toHaveCount(1);
    const visible = await fan.locator(".card3d").evaluateAll((els) => els.filter((e) => getComputedStyle(e).visibility === "visible").length);
    expect(visible).toBe(1);
    // RF-23: un punto por carta.
    await expect(fan.locator('[data-testid="deck-dots"] i')).toHaveCount(2);
    // RF-21: la de arriba es Legendaria: el mazo late.
    await expect(fan.locator(".cards[data-omen]")).toHaveCount(1);
    // RF-20 y RF-22: el botón la voltea; sale con la estrella de su rareza (y los rayos, salvo movimiento reducido).
    await fan.click('[data-testid="deck-next"]');
    await expect(fan.locator('[data-testid="reveal-info"]')).toBeVisible();
    await expect(fan.locator('[data-testid="special-star"]')).toHaveText("LEG");
    if (!reduced) await expect(fan.locator(".deck-fx__rays--on")).toHaveCount(1);
    await expect(fan.locator(".hint")).toContainText(es.common.rarity.legendary);
    await shot(fan, "4-legendaria");
    // RF-20: con el mismo gesto (aquí, el botón) se aparta y pasa a la siguiente.
    await fan.click('[data-testid="deck-next"]');
    await expect(fan.locator('[data-testid="reveal-info"]')).toHaveCount(0);
    await revealTop(fan);
    await fan.click('[data-testid="deck-next"]');
  });

  await test.step("RF-23: el resumen «Tu sobre» con miniaturas, rareza y «¡Nueva!»", async () => {
    await expect(fan.locator(".summary")).toBeVisible();
    await expect(fan.locator(".summary__title")).toContainText(es.packs.sobre.summaryTitle);
    await expect(fan.locator(".summary__thumb img")).toHaveCount(2);
    await expect(fan.locator(".summary__row.rarity-legendary")).toHaveCount(2);
    await expect(fan.locator(".summary__row").first()).toContainText("¡Nueva!");
    await shot(fan, "5-resumen");
  });

  await test.step("RF-25: «Abrir todos» con el sobre nuevo y el efecto especial en la Legendaria destacada", async () => {
    await giftPacks(admin, fanName, code, 2, "gold");
    await fan.goto("/packs");
    await dismissCelebration(fan);
    await fan.click(`[data-testid="group-${code}-gold"] >> text=${es.packs.mine.openAll(2)}`);
    await expect(fan.locator('[data-testid="pack-thumb"] img').first()).toHaveAttribute("src", /pack-asset\?t=gold/);
    await fan.click('[data-testid="open-all"]');
    // La ráfaga de siempre (sin ella con movimiento reducido) y, después, la destacada con su estrella.
    if (!reduced) await expect(fan.locator('[data-testid="open-all-burst"]')).toBeVisible();
    const focus = fan.locator('[data-testid="open-all-focus"]');
    await expect(focus).toBeVisible({ timeout: 30_000 });
    await expect(focus.locator('[data-testid="special-star"]')).toHaveText("LEG");
    await shot(fan, "6-abrir-todos");
  });

  await test.step("RF-15 y RF-24: el plata se abre con el sobre básico y el flujo de siempre", async () => {
    await fan.goto("/packs");
    await fan.click(`[data-testid="group-${code}"] >> text=${es.packs.mine.openOne}`);
    await expect(fan.locator('[data-testid="tear-pack"][data-kind="silver"]:not([data-designed]) .sc-sobre')).toBeVisible();
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="deck"]')).toBeVisible({ timeout: 15_000 });
  });
});
