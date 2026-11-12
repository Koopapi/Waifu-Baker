// Criterios de finalización de la spec 039: el simulador revela la carta viva del armador, con el sello una sola vez y
// sin la insignia de la escena → el resumen del simulador con la imagen fija holo, sin insignia → el editor de una carta
// sin la vista previa anterior → el diseñador de sobres saca la carta de muestra viva.
import type { Locator } from "@playwright/test";
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, dismissTop, giftPacks, login, revealTop, tear } from "./helpers";

// Las capas vienen del panel: las de la colección o los fondos de la biblioteca.
const LAYER_SRC = /^\/api\/admin\/assets\/(sets\/[^/]+\/layers|library)\//;

/**
 * RF-17: el sello de la carta viva sobresale de la carta (como en el armador) y ningún contenedor hasta la escena lo
 * recorta. Devuelve el contenedor que lo recorta, o `null`.
 */
async function sealClippedBy(live: Locator) {
  const seal = live.locator(".cc-sello");
  await expect(seal).toHaveClass(/cc-pop/);
  return seal.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const card = el.closest(".card3d")!.getBoundingClientRect();
    if (r.top >= card.top && r.left >= card.left) return "el sello no sobresale de la carta";
    for (let a = el.parentElement; a && !a.classList.contains("stage"); a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflow === "visible" && !/paint|strict|content/.test(cs.contain)) continue;
      const b = a.getBoundingClientRect();
      if (r.left < b.left - 1 || r.top < b.top - 1 || r.right > b.right + 1 || r.bottom > b.bottom + 1) return String(a.className);
    }
    return null;
  });
}

test("la carta del armador también en el panel", async ({ browser }) => {
  test.setTimeout(300_000);
  const project = test.info().project.name;
  // Con movimiento reducido la apertura no monta la carta viva (spec 018): se queda con la imagen fija.
  const live = project !== "reduced-motion";
  const tag = project.replace(/[^a-z0-9]/g, "");
  const code = `CP${tag.slice(0, 4).toUpperCase()}`;
  const admin = await login(browser, `admin-cp-${tag}`, true);
  // Colección armada y toda holo (100 %): cada copia del simulador es holo.
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3, 100);

  await test.step("RF-1, RF-2, RF-3 y RF-4: el simulador revela la carta viva, con un solo sello y sin la insignia de la escena", async () => {
    await admin.goto(`/admin/sets/${setId}/simulate`);
    await tear(admin);
    await revealTop(admin);
    const info = admin.locator('[data-testid="reveal-info"]');
    await expect(info.locator('[data-testid="reveal-badge"]')).toHaveCount(0);
    await expect(info.locator(".reveal-info__mini")).toHaveCount(0);
    await expect(info.locator(".reveal-info__name")).toContainText(`${code} carta`);
    if (live) {
      const card = admin.locator(".card3d__live").first();
      await expect(card.locator(".cc-capa img").first()).toHaveAttribute("src", LAYER_SRC);
      await expect(card.locator(".cc-sello")).toHaveCount(1);
      await expect(card.locator(".cc-sello")).toHaveText("C");
      // RF-17: el sello salta al terminar la entrada y se ve completo, también la parte que sobresale.
      expect(await sealClippedBy(card)).toBeNull();
      // RF-4: la copia holo con la vista previa holo del armador.
      await expect(card.locator(".cc-card")).toHaveClass(/cc-con-holo/);
      await admin.waitForTimeout(1_000);
      await admin.screenshot({ path: `test-results/screens/${project}/s039-1-simulador.png` });
    }
  });

  await test.step("RF-17: en la apertura del coleccionista, el sello también se ve completo", async () => {
    if (!live) return;
    const fanName = `fan-cp-${tag}`;
    await giftPacks(admin, fanName, code, 1);
    const fan = await login(browser, fanName, false, "/packs");
    await fan.goto(`/packs/${setId}`);
    await dismissCelebration(fan);
    await tear(fan);
    await revealTop(fan);
    expect(await sealClippedBy(fan.locator(".card3d__live").first())).toBeNull();
    await fan.waitForTimeout(1_000);
    await fan.screenshot({ path: `test-results/screens/${project}/s039-3-apertura.png` });
    await fan.close();
  });

  await test.step("RF-5 y RF-6: el resumen del simulador con la imagen fija holo, sin insignia de rareza", async () => {
    await dismissTop(admin);
    await revealTop(admin);
    await dismissTop(admin);
    await expect(admin.locator(".summary")).toBeVisible();
    await expect(admin.locator('[data-testid="summary-badge"]')).toHaveCount(0);
    const img = admin.locator(".summary__thumb img").first();
    await expect(img).toHaveAttribute("src", /\/api\/admin\/assets\/sets\/[^/]+\/cards\/[^/]+\/holo-mid\.[0-9a-f]+\.webp$/);
    await expect(admin.locator(".summary__thumb.holo-finish")).toHaveCount(0);
  });

  await test.step("RF-10, RF-11 y RF-12: el editor de una carta sin la vista previa anterior", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await admin.click('[aria-label="Editar carta 001"]');
    const editor = admin.locator('[data-testid="card-editor"]');
    await expect(editor.locator('[data-testid="layers-preview"]')).toBeVisible();
    await expect(editor.locator('[data-testid="card-preview"]')).toHaveCount(0);
    await expect(editor.getByText("Ver con efecto holo")).toHaveCount(0);
    await expect(editor.locator('[data-testid="replace-art"]')).toBeAttached();
    await admin.keyboard.press("Escape");
  });

  await test.step("RF-13 y RF-14: el diseñador de sobres saca la carta de muestra viva, con un solo sello", async () => {
    await admin.goto(`/admin/sets/${setId}/pack/silver`);
    await admin.click('[data-testid="pack-test"]');
    await expect(admin.locator('[data-testid="pack-test-next"]')).toBeVisible({ timeout: 10_000 });
    const shown = admin.locator('[data-testid="pack-preview"] .pack-designer__card').first();
    await expect(shown.locator(".cc-capa img").first()).toHaveAttribute("src", LAYER_SRC);
    await expect(shown.locator(".cc-sello")).toHaveCount(1);
    await expect(shown.locator(".cc-sello")).toHaveText("C");
    await admin.screenshot({ path: `test-results/screens/${project}/s039-2-disenador.png` });
  });
});
