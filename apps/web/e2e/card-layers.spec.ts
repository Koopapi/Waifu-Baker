// Spec 016, entrega 1: el editor de cartas por capas del panel (subir capas, vista previa en vivo, guardar, recargar,
// conflicto entre dos administradores y quitar capas).
import type { Page } from "@playwright/test";
import path from "node:path";
import { desktopOnly, expect, test } from "./fixtures";
import { LAB, createPublishedSet, login } from "./helpers";

const YUKI = path.resolve(__dirname, "../../../docs/waifu-baker/waifu-baker/codigo/carta-capas/cartas/yuki");
const LAYERS = ["yuki_1_fondo.webp", "yuki_3_personaje.webp", "yuki_4_particulas1.webp"].map((f) => path.join(YUKI, f));

async function openEditor(page: Page, setId: string) {
  await page.goto(`/admin/sets/${setId}`);
  await page.click('[aria-label="Editar carta 001"]');
  const editor = page.locator('[data-testid="layers-editor"]');
  await expect(editor).toBeVisible();
  return editor;
}

test("editor de cartas por capas", async ({ browser }) => {
  desktopOnly();
  const admin = await login(browser, "admin-capas", true);
  const setId = await createPublishedSet(admin, "CAP1", ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);

  await test.step("RF-3, RF-5 y RF-6: el editor de la carta tiene la sección de capas y sube varias a la vez", async () => {
    const editor = await openEditor(admin, setId);
    await expect(editor.locator('[data-testid="layers-preview"]')).toContainText("Todavía no hay capas");
    await admin.setInputFiles('[data-testid="layers-upload"]', LAYERS);
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(3);
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("escalada al lienzo");
    // La vista previa monta la carta por capas en vivo, sin guardar nada.
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card img')).toHaveCount(3);
  });

  await test.step("RF-19 y RF-20: una capa de otra proporción se rechaza con su motivo y el resto sigue", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await admin.setInputFiles('[data-testid="layers-upload"]', [path.join(LAB, "01.webp"), path.join(YUKI, "yuki_5_insignia.webp")]);
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("01.webp:");
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("proporción del lienzo");
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(4);
  });

  await test.step("RF-5, RF-6 y RF-9: los ajustes cambian la vista previa al momento", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await editor.locator('[data-testid="layer-row"]').nth(3).getByRole("checkbox", { name: "Visible" }).uncheck();
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card img')).toHaveCount(3);
    await editor.locator('[data-testid="layer-row"]').nth(3).getByRole("button", { name: /^Quitar capa/ }).click();
    await editor.locator('[data-testid="layers-apply-rarity"]').click();
    // La carta 001 es común (n): marco plateado, sin partículas ni sello; las tres capas de imagen siguen.
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(3);
  });

  await test.step("RF-5, RF-12 y RF-18: guardar y, al volver, las capas siguen", async () => {
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    await admin.reload();
    const editor = await openEditor(admin, setId);
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(3);
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card')).toBeVisible();
  });

  await test.step("RF-17 y RF-18: si otro administrador guardó antes, avisa; recargar trae su versión", async () => {
    const other = await login(browser, "admin-capas", true);
    const a = await openEditor(admin, setId);
    const b = await openEditor(other, setId);
    await a.getByRole("button", { name: "Añadir partículas" }).click();
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    await b.locator('[data-testid="layer-row"]').first().getByRole("button", { name: /^Quitar capa/ }).click();
    await other.click('[data-testid="layers-save"]');
    await expect(other.locator('[data-testid="layers-conflict"]')).toBeVisible();
    await other.click('[data-testid="layers-reload"]');
    await expect(b.locator('[data-testid="layer-row"]')).toHaveCount(4);
    await expect(other.locator('[data-testid="layers-conflict"]')).toHaveCount(0);
  });

  await test.step("RF-14: quitar todas las capas devuelve la carta a su imagen original", async () => {
    await admin.reload();
    const editor = await openEditor(admin, setId);
    await admin.click('[data-testid="layers-remove"]');
    await admin.click('[data-testid="confirm-accept"]');
    await expect(editor.locator('[data-testid="layers-notice"]')).toContainText("vuelve a su imagen original");
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(0);
  });
});
