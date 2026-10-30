// Criterios de la spec 025 (configurador de cartas v4 de Bruno en el panel): distribución y componentes del
// configurador, brillo solo sobre el dibujo, intensidad del holo, «Probar revelado», marco personalizado y grosor del
// borde, subir por nombre, «Usar como sello» con recorte, partículas de un solo color y otra variación; guardar y volver.
import type { Locator, Page } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { desktopOnly, expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, login, setSlider } from "./helpers";

const YUKI = path.resolve(__dirname, "../../../docs/waifu-baker/configurador-cartas/src/cartas/yuki");

async function openEditor(page: Page, setId: string, n = "002") {
  await page.goto(`/admin/sets/${setId}`);
  await page.click(`[aria-label="Editar carta ${n}"]`);
  const editor = page.locator('[data-testid="layers-editor"]');
  await expect(editor).toBeVisible();
  return editor;
}

const rows = (editor: Locator) => editor.locator('[data-testid="layer-row"]');
const row = (editor: Locator, text: string) => rows(editor).filter({ hasText: text });
const openRow = async (r: Locator) => {
  const toggle = r.locator("button[aria-expanded]");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
};

test("configurador v4: los controles de Bruno en el editor del panel", async ({ browser }) => {
  desktopOnly();
  test.setTimeout(300_000);
  const admin = await login(browser, "admin-cfg4", true);
  const setId = await createPublishedSet(admin, "CFG4", ["03.webp", "04.webp"].map((f) => path.join(LAB, f)), 2);
  const editor = await openEditor(admin, setId);
  const preview = editor.locator('[data-testid="layers-preview"]');
  const card = preview.locator(".cc-card");

  await test.step("RF-21 y RF-23: vista previa a la izquierda con sus ajustes debajo; la lista con la de adelante arriba", async () => {
    await expect(card).toBeVisible();
    const stage = (await preview.boundingBox())!;
    const controls = (await editor.locator('[data-testid="layers-preview-controls"]').boundingBox())!;
    const list = (await editor.locator('[data-testid="layers-list"]').boundingBox())!;
    expect(controls.y).toBeGreaterThan(stage.y + stage.height - 1);
    expect(list.x).toBeGreaterThan(stage.x + stage.width - 1);
    await expect(editor.getByText("Adelante", { exact: true })).toBeVisible();
    await expect(editor.getByText("Atrás", { exact: true })).toBeVisible();
    await expect(rows(editor).first()).toContainText("Chica");
  });

  await test.step("RF-1, RF-2 y RF-24: brillo holográfico solo sobre la chica, desde su fila abierta", async () => {
    const chica = row(editor, "Chica");
    await openRow(chica);
    await expect(chica).toHaveAttribute("data-open", "true");
    await choose(chica, "Brillo solo en el dibujo", "Holográfico");
    await expect(preview.locator(".cc-brillo-holo")).toHaveCount(1);
    expect(await preview.locator(".cc-brillo-holo").evaluate((el) => (el as HTMLElement).style.maskImage || (el as HTMLElement).style.getPropertyValue("-webkit-mask-image"))).toContain("/api/admin/assets/");
    await setSlider(chica.locator('[data-testid="layer-gloss-intensity"]'), 0.9);
    await expect(preview.locator(".cc-brillo-holo")).toHaveAttribute("style", /--cc-bi:\s*0\.9/);
    await expect(chica).toContainText("✦ brillo");
  });

  await test.step("RF-3, RF-8 y RF-10: versión holo, intensidad del holo, parallax e inclinación en vivo", async () => {
    await editor.getByRole("checkbox", { name: "Versión holo" }).check();
    await expect(card).toHaveClass(/cc-con-holo/);
    await setSlider(editor.locator('[data-testid="layers-holo-intensity"]'), 0.8);
    await expect(card).toHaveAttribute("style", /--cc-holo-i:\s*0\.8/);
    await setSlider(editor.locator('[data-testid="preview-depth"]'), 25);
    await setSlider(editor.locator('[data-testid="preview-tilt"]'), 20);
    await expect(editor.locator("output", { hasText: "25 px" })).toBeVisible();
    await expect(editor.locator("output", { hasText: "20°" })).toBeVisible();
    // Ajustes de la vista previa: no ensucian la carta (solo la intensidad del holo cambia lo guardado).
    await expect(editor.getByText("Cambios sin guardar")).toBeVisible();
  });

  await test.step("RF-9: «Probar revelado» esconde el sello y lo hace entrar", async () => {
    await editor.locator('[data-testid="layers-test-reveal"]').click();
    await expect(preview.locator(".cc-sello")).toHaveClass(/cc-pop/);
    await expect(card).toHaveClass(/cc-entra/);
  });

  await test.step("RF-16 y RF-11: marco personalizado con dos colores y grosor del borde", async () => {
    await editor.getByRole("radio", { name: "Personalizado" }).click();
    await expect(editor.locator('[data-testid="layers-custom-frame"]')).toBeVisible();
    await setSlider(editor.locator('input[data-testid="frame-color"]'), "#10c040");
    await expect(card).toHaveAttribute("style", /--cc-marco:\s*linear-gradient\(135deg,\s*(#07561d|rgb\(7, 86, 29\))/);
    await setSlider(editor.locator('[data-testid="layers-border"]'), 4);
    await expect(card).toHaveAttribute("style", /--cc-borde:\s*4cqw/);
    // «Sin marco» desactiva el grosor.
    await editor.getByRole("radio", { name: "Sin marco" }).click();
    await expect(card).toHaveClass(/cc-sin-marco/);
    await expect(editor.locator('[data-testid="layers-border"]')).toBeDisabled();
    await editor.getByRole("radio", { name: "Personalizado" }).click();
  });

  await test.step("RF-20, RF-12 y RF-13: subir por nombre; una capa pasa a ser el sello recortado", async () => {
    const before = await rows(editor).count();
    // Un adorno pequeño en una esquina de un lienzo transparente (la insignia de Yuki ocupa el 87 % y no se recorta).
    const adorno = path.join(mkdtempSync(path.join(os.tmpdir(), "wb-s025-")), "adorno_esquina.png");
    await sharp({ create: { width: 700, height: 991, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from('<svg width="160" height="120"><rect width="160" height="120" rx="20" fill="#ffd36e"/></svg>'), left: 40, top: 40 }])
      .png()
      .toFile(adorno);
    await admin.setInputFiles('[data-testid="layers-upload"]', [path.join(YUKI, "yuki_ssr.webp"), adorno]);
    // «ssr» en el nombre: es el sello, no una capa; el adorno, una capa delante de todo.
    await expect(rows(editor)).toHaveCount(before + 1);
    await expect(editor.getByRole("radio", { name: "Imagen" })).toHaveAttribute("aria-checked", "true");
    const capa = rows(editor).first();
    await openRow(capa);
    await capa.locator('[data-testid="layer-use-as-seal"]').click();
    await expect(rows(editor)).toHaveCount(before);
    // El adorno ocupa una esquina del lienzo: el sello se recorta a su contenido.
    await expect(preview.locator(".cc-sello .cc-sello-crop")).toHaveCount(1);
  });

  await test.step("RF-14 y RF-15: partículas detrás de la chica, de un solo color y con otra variación", async () => {
    await editor.getByRole("button", { name: "Añadir partículas" }).click();
    const parts = row(editor, "Chica").locator("xpath=following-sibling::li[1]");
    await expect(parts).toContainText("Destellos dorados");
    await openRow(parts);
    await parts.getByRole("checkbox", { name: "Un solo color" }).check();
    // Las nuevas son la última capa de partículas (justo detrás de la chica; las del estilo van detrás de ellas).
    const first = () => preview.locator(".cc-part").last().locator("i").first();
    await expect(first()).toHaveAttribute("style", /--c:#ffd36e/);
    const before = await first().getAttribute("style");
    await parts.locator('[data-testid="particles-reseed"]').click();
    await expect.poll(() => first().getAttribute("style")).not.toBe(before);
  });

  await test.step("RF-26 a RF-30: guardar y, al volver, el brillo, el holo y el marco siguen", async () => {
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    const again = await openEditor(admin, setId);
    await expect(row(again, "Chica")).toContainText("✦ brillo");
    await expect(again.getByRole("radio", { name: "Personalizado" })).toHaveAttribute("aria-checked", "true");
    await again.getByRole("checkbox", { name: "Versión holo" }).check();
    await expect(again.locator('[data-testid="layers-holo-intensity"]')).toHaveValue("0.8");
    await expect(again.locator('[data-testid="layers-preview"] .cc-brillo-holo')).toHaveCount(1);
  });

  await test.step("RF-21: a 390 px la vista previa va arriba y no hay scroll horizontal en el editor", async () => {
    await admin.setViewportSize({ width: 390, height: 844 });
    const ed = admin.locator('[data-testid="layers-editor"]');
    const stage = (await ed.locator('[data-testid="layers-preview"]').boundingBox())!;
    const list = (await ed.locator('[data-testid="layers-list"]').boundingBox())!;
    expect(list.y).toBeGreaterThan(stage.y);
    expect(await ed.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });
});
