// Criterios de la spec 017 (armado de cartas por capas): la carta nace con la chica, fondos de la biblioteca o propios,
// encuadre, estilo automático, exportar e importar el formato del creador.
import type { Page } from "@playwright/test";
import path from "node:path";
import { desktopOnly, expect, test } from "./fixtures";
import { LAB, createPublishedSet, login } from "./helpers";

const YUKI = path.resolve(__dirname, "../../../docs/waifu-baker/waifu-baker/codigo/carta-capas/cartas/yuki");

async function openEditor(page: Page, setId: string, n = "001") {
  await page.goto(`/admin/sets/${setId}`);
  await page.click(`[aria-label="Editar carta ${n}"]`);
  const editor = page.locator('[data-testid="layers-editor"]');
  await expect(editor).toBeVisible();
  return editor;
}

test("armado por capas: fondos, encuadre y estilo automático", async ({ browser }) => {
  desktopOnly();
  const admin = await login(browser, "admin-armado", true);
  const setId = await createPublishedSet(admin, "ARM1", ["03.webp", "04.webp"].map((f) => path.join(LAB, f)), 2);

  await test.step("RF-1 y RF-20: la carta nace con la chica como personaje y la de prueba viene armada", async () => {
    const editor = await openEditor(admin, setId);
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(2);
    await expect(editor.locator('[data-testid="layer-row"]').nth(0)).toContainText("Fondo");
    await expect(editor.locator('[data-testid="layer-row"]').nth(1)).toContainText("Chica");
    await expect(editor.locator('[data-testid="layers-character"]')).toBeVisible();
  });

  await test.step("RF-5: la chica no se puede quitar ni ocultar, ni la carta volver a su imagen original", async () => {
    const chica = admin.locator('[data-testid="layers-editor"] [data-testid="layer-row"]', { hasText: "Chica" });
    await expect(chica.getByRole("button", { name: /^Quitar capa/ })).toBeDisabled();
    await expect(chica.getByRole("checkbox", { name: "Visible" })).toBeDisabled();
    await expect(admin.locator('[data-testid="layers-remove"]')).toHaveCount(0);
  });

  await test.step("RF-6: subir un fondo a la biblioteca de la colección", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    // La colección de prueba ya trae su «Fondo de prueba», que usan sus dos cartas.
    await expect(admin.locator('[data-testid="background-item"]', { hasText: "Fondo de prueba" })).toContainText("En 2 cartas");
    await admin.setInputFiles('[data-testid="backgrounds-input"]', path.join(YUKI, "yuki_1_fondo.webp"));
    const item = admin.locator('[data-testid="background-item"]', { hasText: "yuki_1_fondo" });
    await expect(item).toContainText("Sin usar");
  });

  await test.step("RF-8 y RF-9: la carta usa el fondo de la biblioteca y ya no se puede quitar", async () => {
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

  await test.step("RF-10 a RF-12: encuadrar a la chica con números, teclado y arrastre, y restablecer", async () => {
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

  await test.step("RF-8: un fondo propio de esta carta", async () => {
    const editor = await openEditor(admin, setId, "002");
    await editor.getByRole("tab", { name: "Propio de esta carta" }).click();
    await admin.setInputFiles('[data-testid="layers-background-upload"]', path.join(YUKI, "yuki_1_fondo.webp"));
    await expect(editor.locator('[data-testid="layer-row"]').first()).toContainText("Fondo");
    // El fondo propio sustituye al de la biblioteca: ninguno de la biblioteca queda elegido.
    await editor.getByRole("tab", { name: "Biblioteca de la colección" }).click();
    await expect(editor.locator('[data-testid="layers-background-option"][aria-pressed="true"]')).toHaveCount(0);
  });

  await test.step("RF-13 y RF-14: el estilo es automático hasta que se toca a mano", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await expect(editor.locator('[data-testid="layers-style"]')).toContainText("Automático · Rara → R");
    await editor.getByRole("button", { name: "Añadir partículas" }).click();
    await expect(editor.locator('[data-testid="layers-style"]')).toContainText("Manual");
    await editor.locator('[data-testid="layers-apply-rarity"]').click();
    await expect(editor.locator('[data-testid="layers-style"]')).toContainText("Automático");
  });

  await test.step("RF-4: sustituir la chica conserva su encuadre", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await editor.locator('input[data-testid="framing-x"]').fill("12");
    await admin.setInputFiles('[data-testid="layers-replace-character"]', path.join(YUKI, "yuki_3_personaje.webp"));
    await expect(editor.locator('[data-testid="layers-uploads"]')).toContainText("yuki_3_personaje.webp");
    await expect(editor.locator('[data-testid="layers-uploads"]')).not.toContainText("no está recortada");
    await expect(editor.locator('input[data-testid="framing-x"]')).toHaveValue("12");
  });

  await test.step("RF-17: exportar la carta en el formato del creador", async () => {
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    const [download] = await Promise.all([admin.waitForEvent("download"), admin.click('[data-testid="layers-export"]')]);
    expect(download.suggestedFilename()).toBe("ARM1-carta-002.zip");
  });

  await test.step("RF-18: una configuración no válida o sin sus archivos no cambia la carta", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    const rows = await editor.locator('[data-testid="layer-row"]').count();
    await admin.setInputFiles('[data-testid="layers-import"]', { name: "mala.json", mimeType: "application/json", buffer: Buffer.from('{"marco":"dorado","capas":[]}') });
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("falla «marco»");
    await admin.setInputFiles('[data-testid="layers-import"]', path.join(YUKI, "..", "yuki.json"));
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Faltan archivos de la configuración");
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(rows);
  });

  await test.step("RF-18: importar la carta de Yuki del creador con sus archivos", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    const files = ["yuki_1_fondo.webp", "yuki_3_personaje.webp", "yuki_4_particulas1.webp", "yuki_5_insignia.webp", "yuki_ssr.webp"].map((f) => path.join(YUKI, f));
    await admin.setInputFiles('[data-testid="layers-import"]', [path.join(YUKI, "..", "yuki.json"), ...files]);
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Configuración importada");
    await expect(editor.locator('[data-testid="layer-row"]')).toHaveCount(5);
    await expect(editor.locator('[data-testid="layer-row"]').nth(0)).toContainText("Fondo");
    await expect(editor.locator('[data-testid="layer-row"]').nth(2)).toContainText("Chica");
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
  });
});
