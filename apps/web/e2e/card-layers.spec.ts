// Criterios de la spec 016 (editor de cartas por capas: subir capas, vista previa en vivo, guardar, recargar, conflicto
// entre dos administradores). Desde la spec 017 la carta nace armada (sus criterios, en card-assembly.spec.ts).
import type { Page } from "@playwright/test";
import path from "node:path";
import { desktopOnly, expect, test } from "./fixtures";
import { LAB, createPublishedSet, login } from "./helpers";

const YUKI = path.resolve(__dirname, "../../../docs/waifu-baker/waifu-baker/codigo/carta-capas/cartas/yuki");
const LAYERS = ["yuki_1_fondo.webp", "yuki_3_personaje.webp", "yuki_4_particulas1.webp"].map((f) => path.join(YUKI, f));

async function openEditor(page: Page, setId: string, n = "001") {
  await page.goto(`/admin/sets/${setId}`);
  await page.click(`[aria-label="Editar carta ${n}"]`);
  const editor = page.locator('[data-testid="layers-editor"]');
  await expect(editor).toBeVisible();
  return editor;
}

test("editor de cartas por capas", async ({ browser }) => {
  desktopOnly();
  const admin = await login(browser, "admin-capas", true);
  const setId = await createPublishedSet(admin, "CAP1", ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);

  await test.step("La carta de prueba nace armada: fondo y chica (spec 017)", async () => {
    const editor = await openEditor(admin, setId);
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(2);
    await expect(editor.locator('[data-testid="layer-row"]').nth(0)).toContainText("Fondo");
    await expect(editor.locator('[data-testid="layer-row"]').nth(1)).toContainText("Chica");
    await expect(editor.locator('[data-testid="layers-character"]')).toBeVisible();
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card img')).toHaveCount(2);
  });

  await test.step("RF-3, RF-5 y RF-6: el editor sube varias capas a la vez con vista previa en vivo", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await admin.setInputFiles('[data-testid="layers-upload"]', LAYERS);
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(5);
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("escalada al lienzo");
    // La vista previa monta la carta por capas en vivo, sin guardar nada.
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card img')).toHaveCount(5);
  });

  await test.step("RF-19 y RF-20: una capa de otra proporción se rechaza con su motivo y el resto sigue", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await admin.setInputFiles('[data-testid="layers-upload"]', [path.join(LAB, "01.webp"), path.join(YUKI, "yuki_5_insignia.webp")]);
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("01.webp:");
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("proporción del lienzo");
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(6);
  });

  await test.step("RF-5, RF-6 y RF-9: los ajustes cambian la vista previa al momento", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await editor.locator('[data-testid="layer-row"]').nth(5).getByRole("checkbox", { name: "Visible" }).uncheck();
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card img')).toHaveCount(5);
    await editor.locator('[data-testid="layer-row"]').nth(5).getByRole("button", { name: /^Quitar capa/ }).click();
    await editor.locator('[data-testid="layers-apply-rarity"]').click();
    // La carta 001 es común (n): marco plateado, sin partículas ni sello; las cinco capas de imagen siguen.
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(5);
  });

  await test.step("La chica no se puede quitar ni ocultar (spec 017)", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    const chica = editor.locator('[data-testid="layer-row"]', { hasText: "Chica" });
    await expect(chica.getByRole("button", { name: /^Quitar capa/ })).toBeDisabled();
    await expect(chica.getByRole("checkbox", { name: "Visible" })).toBeDisabled();
    await expect(editor.locator('[data-testid="layers-remove"]')).toHaveCount(0);
  });

  await test.step("RF-5, RF-12 y RF-18: guardar y, al volver, las capas siguen", async () => {
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    await admin.reload();
    const editor = await openEditor(admin, setId);
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(5);
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card')).toBeVisible();
  });

  await test.step("RF-11: la carta por capas no lleva texto encima (ni número ni nombre)", async () => {
    const card = admin.locator('[data-testid="layers-preview"] .cc-card');
    // La común (escalón N) no lleva sello: dentro de la carta no hay ningún texto.
    await expect(card).toHaveText("");
    expect(await card.evaluate((el) => el.textContent ?? "")).not.toMatch(/001|carta/i);
  });

  await test.step("RF-17 y RF-18: si otro administrador guardó antes, avisa; recargar trae su versión", async () => {
    const other = await login(browser, "admin-capas", true);
    const a = await openEditor(admin, setId);
    const b = await openEditor(other, setId);
    await a.getByRole("button", { name: "Añadir partículas" }).click();
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    await b.locator('[data-testid="layer-row"]').nth(2).getByRole("button", { name: /^Quitar capa/ }).click();
    await other.click('[data-testid="layers-save"]');
    await expect(other.locator('[data-testid="layers-conflict"]')).toBeVisible();
    await other.click('[data-testid="layers-reload"]');
    await expect(b.locator('[data-testid="layer-row"]')).toHaveCount(6);
    await expect(other.locator('[data-testid="layers-conflict"]')).toHaveCount(0);
  });
});
