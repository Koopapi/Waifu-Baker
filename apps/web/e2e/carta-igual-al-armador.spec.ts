// Criterios de finalización de la spec 034: lo que se ve en el armador al guardar es la carta final.
// 1. En el armador se cambian el movimiento y el holo de la común y se guardan; al reabrirla vuelven.
// 2. La firma de la carta (`data-config-sig`: capas, encuadre, marco, sello, holo y movimiento, sin los enlaces) es la
//    misma en el armador, en la apertura, en la ficha de «Mi colección» y en «Abrir todos».
// 3. Con la carta viva cargada, la apertura no añade sus brillos.
// Con movimiento reducido no hay carta viva: lo cubren `live-cards` y `rarezas-sobres`.
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, dismissTop, giftPacks, login, revealTop, setSlider, tear } from "./helpers";

const sigOf = (p: Page, scope: string) => p.locator(`${scope} [data-config-sig]`).first().getAttribute("data-config-sig");
const shot = (p: Page, name: string) => p.screenshot({ path: `test-results/screens/${test.info().project.name}/s034-${name}.png` });

test("la carta se ve igual que en el armador", async ({ browser }) => {
  test.skip(test.info().project.name === "reduced-motion", "con movimiento reducido no se monta la carta viva");
  test.setTimeout(300_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  const code = `CA${tag.slice(0, 2).toUpperCase()}${stamp}`;
  const fanName = `fan-ca-${tag}-${stamp}`;
  const fan2Name = `fan-ca2-${tag}-${stamp}`;
  const admin = await login(browser, `admin-ca-${tag}`, true);
  const fan = await login(browser, fanName, false, "/packs");
  const fan2 = await login(browser, fan2Name, false, "/packs");
  // 001 común y 002 rara (y la 003, legendaria del sobre gold).
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);
  const sig: Record<string, string> = {};

  await test.step("RF-12, RF-13 y RF-15: el movimiento y el holo de la común se guardan con la carta", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await admin.click('[aria-label="Editar carta 001"]');
    const editor = admin.locator('[data-testid="layers-editor"]');
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card')).toBeVisible();
    const before = await sigOf(admin, '[data-testid="layers-preview"]');
    await setSlider(editor.locator('input[data-testid="preview-depth"]'), 4);
    await setSlider(editor.locator('input[data-testid="preview-tilt"]'), 22);
    await editor.locator('[data-testid="preview-holo"]').click();
    await expect.poll(() => sigOf(admin, '[data-testid="layers-preview"]')).not.toBe(before);
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="card-save-bar"]')).toContainText(/Guardado a las/);
    await admin.click('[data-testid="card-cancel"]');
    // Al reabrirla, los controles y la vista previa salen con lo guardado.
    await admin.click('[aria-label="Editar carta 001"]');
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card')).toBeVisible();
    await expect(editor.locator('input[data-testid="preview-depth"]')).toHaveValue("4");
    await expect(editor.locator('input[data-testid="preview-tilt"]')).toHaveValue("22");
    sig["001"] = (await sigOf(admin, '[data-testid="layers-preview"]'))!;
    expect(sig["001"]).not.toBe(before);
    await shot(admin, "1-armador-comun");
    await admin.click('[data-testid="card-cancel"]');
    // La rara, sin tocar: valores de fábrica.
    await admin.click('[aria-label="Editar carta 002"]');
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card')).toBeVisible();
    sig["002"] = (await sigOf(admin, '[data-testid="layers-preview"]'))!;
    await shot(admin, "2-armador-rara");
    await admin.click('[data-testid="card-cancel"]');
  });

  await test.step("RF-1, RF-5, RF-6 y RF-9: en la apertura, la común y la rara son las del armador", async () => {
    await giftPacks(admin, fanName, code, 1);
    await fan.goto("/packs");
    await dismissCelebration(fan);
    await fan.click(`[data-testid="group-${code}"] >> text=Abrir un sobre`);
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="deck"]')).toBeVisible();
    // El mazo va de menor a mayor rareza: primero la común.
    await revealTop(fan);
    await expect(fan.locator(".card3d__live .cc-card:not(.cc-cargando)").first()).toBeVisible();
    await expect.poll(() => sigOf(fan, ".card3d__live")).toBe(sig["001"]);
    // RF-5: con la carta viva cargada, los brillos propios de la apertura no se ven.
    const shine = fan.locator(".card3d__front .holo--shine").first();
    if (await shine.count()) await expect.poll(() => shine.evaluate((e) => getComputedStyle(e).opacity)).toBe("0");
    await shot(fan, "3-apertura-comun");
    await dismissTop(fan);
    await revealTop(fan);
    await expect.poll(() => sigOf(fan, ".card3d__live")).toBe(sig["002"]);
    await shot(fan, "4-apertura-rara");
  });

  await test.step("RF-3 y RF-4: la ficha de «Mi colección» es la del armador, con su proporción", async () => {
    await fan.goto(`/collection/${setId}`);
    await fan.click('[aria-label="Ver carta 001"]');
    const art = fan.locator('[data-testid="card-sheet-art"]');
    await expect(art.locator(".cc-card")).toBeVisible();
    await expect.poll(() => sigOf(fan, '[data-testid="card-sheet-art"]')).toBe(sig["001"]);
    const box = await art.locator("[data-config-sig]").first().boundingBox();
    expect(Math.abs(box!.width / box!.height - 700 / 991)).toBeLessThan(0.01);
    await shot(fan, "5-ficha-comun");
  });

  await test.step("RF-2: en «Abrir todos», la destacada es la del armador", async () => {
    await giftPacks(admin, fan2Name, code, 1);
    await fan2.goto(`/packs/${setId}/all`);
    await fan2.waitForLoadState("networkidle");
    await fan2.click('[data-testid="open-all"]');
    await expect(fan2.locator('[data-testid="focus-card"] .cc-card')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => sigOf(fan2, '[data-testid="focus-card"]')).toBe(sig["002"]);
  });

  for (const p of [admin, fan, fan2]) await p.context().close();
});
