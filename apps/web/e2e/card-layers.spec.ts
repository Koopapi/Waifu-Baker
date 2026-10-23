// Criterios de la spec 016 (editor de cartas por capas: subir capas, vista previa en vivo, guardar, recargar, conflicto
// entre dos administradores) y de la spec 017 (la carta nace con la chica, fondos de la biblioteca o propios, encuadre y
// estilo automático).
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

  await test.step("Spec 017, RF-1 y RF-20: la carta nace con la chica como personaje y la de prueba viene armada", async () => {
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

  await test.step("Spec 017, RF-5: la chica no se puede quitar ni ocultar, ni la carta volver a su imagen original", async () => {
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

test("armado por capas: fondos, encuadre y estilo automático", async ({ browser }) => {
  desktopOnly();
  const admin = await login(browser, "admin-armado", true);
  const setId = await createPublishedSet(admin, "ARM1", ["03.webp", "04.webp"].map((f) => path.join(LAB, f)), 2);

  await test.step("Spec 017, RF-6: subir un fondo a la biblioteca de la colección", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    // La colección de prueba ya trae su «Fondo de prueba», que usan sus dos cartas.
    await expect(admin.locator('[data-testid="background-item"]', { hasText: "Fondo de prueba" })).toContainText("En 2 cartas");
    await admin.setInputFiles('[data-testid="backgrounds-input"]', path.join(YUKI, "yuki_1_fondo.webp"));
    const item = admin.locator('[data-testid="background-item"]', { hasText: "yuki_1_fondo" });
    await expect(item).toContainText("Sin usar");
  });

  await test.step("Spec 017, RF-8 y RF-9: la carta usa el fondo de la biblioteca y ya no se puede quitar", async () => {
    const editor = await openEditor(admin, setId);
    const yuki = editor.getByRole("button", { name: "Usar el fondo yuki_1_fondo" });
    await yuki.click();
    await expect(yuki).toHaveAttribute("aria-pressed", "true");
    await expect(editor.getByRole("button", { name: "Usar el fondo Fondo de prueba" })).toHaveAttribute("aria-pressed", "false");
    await expect(editor.locator('[data-testid="layer-row"]').first()).toContainText("Fondo");
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    await admin.goto(`/admin/sets/${setId}`);
    const item = admin.locator('[data-testid="background-item"]', { hasText: "yuki_1_fondo" });
    await expect(item.locator('[data-testid="background-uses"]')).toContainText("En 1 carta");
    await expect(item.getByRole("button", { name: /^Quitar el fondo/ })).toHaveCount(0);
  });

  await test.step("Spec 017, RF-10 a RF-12: encuadrar a la chica con números, teclado y arrastre, y restablecer", async () => {
    const editor = await openEditor(admin, setId);
    const chica = () => editor.locator('[data-testid="layers-preview"] .cc-capa img').last();
    await editor.locator('input[data-testid="framing-scale"]').fill("150");
    await expect(chica()).toHaveAttribute("style", /scale\(1\.5\)/);
    // La escala tiene un tope del 400 %.
    await editor.locator('input[data-testid="framing-scale"]').fill("900");
    await expect(chica()).toHaveAttribute("style", /scale\(4\)/);
    await editor.locator('[data-testid="layers-preview"]').focus();
    await admin.keyboard.press("ArrowRight");
    await admin.keyboard.press("]");
    await expect(editor.locator('input[data-testid="framing-x"]')).toHaveValue("1");
    await expect(editor.locator('input[data-testid="framing-rotation"]')).toHaveValue("1");
    const box = (await editor.locator('[data-testid="layers-preview"] .cc-card').boundingBox())!;
    await admin.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await admin.mouse.down();
    await admin.mouse.move(box.x + box.width / 2 + box.width / 4, box.y + box.height / 2, { steps: 5 });
    await admin.mouse.up();
    await expect(editor.locator('input[data-testid="framing-x"]')).toHaveValue("26");
    // El parallax sigue en la capa: el encuadre va en la imagen.
    await expect(chica()).toHaveAttribute("style", /translate\(26%/);
    await editor.locator('[data-testid="framing-reset"]').click();
    await expect(editor.locator('input[data-testid="framing-x"]')).toHaveValue("0");
    await expect(editor.locator('input[data-testid="framing-scale"]')).toHaveValue("100");
  });

  await test.step("Spec 017, RF-8: un fondo propio de esta carta", async () => {
    const editor = await openEditor(admin, setId, "002");
    await editor.getByRole("tab", { name: "Propio de esta carta" }).click();
    await admin.setInputFiles('[data-testid="layers-background-upload"]', path.join(YUKI, "yuki_1_fondo.webp"));
    await expect(editor.locator('[data-testid="layer-row"]').first()).toContainText("Fondo");
    // El fondo propio sustituye al de la biblioteca: ninguno de la biblioteca queda elegido.
    await editor.getByRole("tab", { name: "Biblioteca de la colección" }).click();
    await expect(editor.locator('[data-testid="layers-background-option"][aria-pressed="true"]')).toHaveCount(0);
  });

  await test.step("Spec 017, RF-13 y RF-14: el estilo es automático hasta que se toca a mano", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await expect(editor.locator('[data-testid="layers-style"]')).toContainText("Automático · Rara → R");
    await editor.getByRole("button", { name: "Añadir partículas" }).click();
    await expect(editor.locator('[data-testid="layers-style"]')).toContainText("Manual");
    await editor.locator('[data-testid="layers-apply-rarity"]').click();
    await expect(editor.locator('[data-testid="layers-style"]')).toContainText("Automático");
  });

  await test.step("Spec 017, RF-4: sustituir la chica conserva su encuadre", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await editor.locator('input[data-testid="framing-x"]').fill("12");
    await admin.setInputFiles('[data-testid="layers-replace-character"]', path.join(YUKI, "yuki_3_personaje.webp"));
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("yuki_3_personaje.webp");
    await expect(editor.locator('[data-testid="layers-uploads"]')).not.toContainText("no está recortada");
    await expect(editor.locator('input[data-testid="framing-x"]')).toHaveValue("12");
  });
});
