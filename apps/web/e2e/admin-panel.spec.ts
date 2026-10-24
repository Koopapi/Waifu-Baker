// Criterios de finalización de la spec 003: crear colección → subir 10 imágenes → asignar en
// lote → editar probabilidades → simular sobre → publicar → comprobar bloqueos → regalar un sobre.
import type { Browser, Page } from "@playwright/test";
import { DESKTOP, desktopOnly, expect, test } from "./fixtures";
import { assembleSet, choose, tick, untickAdmin } from "./helpers";
import { readdirSync } from "node:fs";
import path from "node:path";

const LAB = path.resolve(__dirname, "../public/lab");
const IMAGES = readdirSync(LAB)
  .filter((f) => f.endsWith(".webp"))
  .sort()
  .map((f) => path.join(LAB, f));

async function login(browser: Browser, name: string, admin: boolean): Promise<Page> {
  const page = await (await browser.newContext(DESKTOP)).newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto("/login?next=/admin");
  await page.fill('input[name="name"]', name);
  if (!admin) await untickAdmin(page);
  await page.click("text=Entrar (desarrollo)");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  return page;
}

test("panel de administración: de colección vacía a sobre regalado", async ({ browser }) => {
  desktopOnly();
  // Un usuario normal: no ve el panel (RF-1, RF-2) y luego recibirá el regalo.
  const fan = await login(browser, "fan-e2e", false);
  await test.step("RF-2: un usuario normal recibe 404 en el panel", async () => {
    const res = await fan.goto("/admin/sets");
    expect(res?.status()).toBe(404);
  });

  const page = await login(browser, "admin-e2e", true);

  await test.step("RF-10: crear un personaje", async () => {
    await page.goto("/admin/characters");
    await page.fill('form:has-text("Nuevo personaje") input[name="name"]', "Aiko Hoshino");
    await page.click("text=Crear personaje");
    await expect(page.locator("text=Personaje «Aiko Hoshino» creado.")).toBeVisible();
  });

  await test.step("RF-4: crear la colección en borrador", async () => {
    await page.goto("/admin/sets");
    await page.fill('input[name="code"]', "E2E1");
    await page.fill('form input[name="name"]', "Colección E2E");
    await page.fill('input[name="packSize"]', "2");
    await page.click("text=Crear colección");
    await expect(page.locator("text=Colección E2E1 creada en borrador.")).toBeVisible();
    await page.click("a:text-is('E2E1')");
    await page.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
  });

  await test.step("RF-11 y RF-15: subir 10 imágenes numeradas por nombre de archivo", async () => {
    await page.setInputFiles('[data-testid="file-input"]', [...IMAGES].reverse());
    await expect(page.locator(`text=Subida terminada · ${IMAGES.length} correctas`)).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("[data-card-tile]")).toHaveCount(IMAGES.length);
    await expect(page.locator('[data-testid="upload-list"] li').first()).toContainText("Carta 001");
    // Spec 017, RF-3: las imágenes de prueba no tienen transparencia; las cartas se crean con el aviso.
    await expect(page.locator('[data-testid="upload-uncut"]')).toHaveCount(IMAGES.length);
  });

  await test.step("RF-14: asignar personaje y rareza en lote", async () => {
    await page.click("text=Seleccionar todas");
    await choose(page, "Personaje para la selección", "Aiko Hoshino");
    await choose(page, "Rareza para la selección", /^Común$/);
    await page.click("text=Aplicar a la selección");
    await expect(page.locator(`text=${IMAGES.length} cartas actualizadas.`)).toBeVisible({ timeout: 60_000 });
    await tick(page, "Seleccionar carta 010");
    await choose(page, "Rareza para la selección", /^Rara$/);
    await page.click("text=Aplicar a la selección");
    await expect(page.locator("text=1 carta actualizada.")).toBeVisible({ timeout: 30_000 });
  });

  await test.step("Nombres de las cartas desde el editor", async () => {
    for (let i = 1; i <= IMAGES.length; i++) {
      const n = String(i).padStart(3, "0");
      await page.click(`[aria-label="Editar carta ${n}"]`);
      await page.fill('[data-testid="card-editor"] input[name="name"]', `Carta de prueba ${n}`);
      await page.click('[data-testid="card-editor"] >> text=Guardar');
      await expect(page.locator('[data-testid="card-editor"]')).toHaveCount(0);
    }
    await expect(page.locator("[data-card-tile] >> text=Lista")).toHaveCount(IMAGES.length);
  });

  await test.step("RF-22: vista previa de la carta compuesta con efecto holo", async () => {
    await page.click('[aria-label="Editar carta 010"]');
    const preview = page.locator('[data-testid="card-preview"]');
    await expect(preview.locator("img")).toHaveAttribute("src", /\/api\/admin\/assets\/.+\/mid\.[0-9a-f]+\.webp$/);
    // Spec 018: la imagen fija de la carta por capas (700 × 991).
    await expect.poll(() => preview.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(700);
    await expect(preview.locator(".card3d--holo")).toHaveCount(0);
    await tick(page, "Ver con efecto holo");
    await expect(preview.locator(".card3d--holo .holo--foil")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="card-editor"]')).toHaveCount(0);
  });

  await test.step("RF-6 y RF-7: publicar con problemas los lista y no publica", async () => {
    await page.click("text=Comprobar y publicar");
    await page.click('[data-testid="confirm-accept"]');
    await expect(page.locator('[data-testid="publish-problems"]')).toContainText("tiene probabilidad en el sobre pero ninguna carta");
    // Spec 017, RF-15: las cartas recién subidas tienen a la chica pero no fondo; cada una sale enlazada.
    await expect(page.locator('[data-testid="publish-problems"]')).toContainText("Carta 001: no está armada (falta el fondo).");
    await expect(page.locator('[data-testid="publish-problems"] a[href="#carta-001"]', { hasText: "no está armada" })).toBeVisible();
    await expect(page.locator('[data-testid="not-assembled"]')).toContainText("10 cartas no están armadas");
    await expect(page.locator("h1 ~ span").first()).toHaveText("Borrador");
  });

  await test.step("RF-20: editar probabilidades (rechaza sumas distintas de 100)", async () => {
    const R = ["Común", "Poco común", "Rara", "Épica", "Legendaria", "Secreta"];
    const fill = async (slot: number, weights: Record<string, number>) => {
      for (const r of R) await page.locator(`[aria-label="Ranura ${slot}, ${r}"]`).fill(String(weights[r] ?? 0));
    };
    await fill(1, { Común: 90 });
    await fill(2, { Rara: 100 });
    await page.click("text=Guardar probabilidades");
    await expect(page.locator("text=La ranura 1 suma 90 % en vez de 100 %.")).toBeVisible();
    await fill(1, { Común: 100 });
    await page.click("text=Guardar probabilidades");
    await expect(page.locator("text=Probabilidades guardadas.")).toBeVisible();
    await expect(page.locator('[data-card-tile="10"]')).toContainText("100 % / sobre");
  });

  await test.step("RF-23: simular un sobre con las cartas reales", async () => {
    await page.click('[data-testid="simulate-link"]');
    await page.waitForURL(/simulate$/);
    const strip = (await page.locator(".pack__strip").boundingBox())!;
    const sx = strip.x + strip.width * 0.3;
    const sy = strip.y + strip.height / 2;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(sx + (220 * i) / 12, sy);
    await page.mouse.up();
    await expect(page.locator('.stage[data-phase="fanned"]')).toBeVisible();
    await page.locator('.card3d[role="button"]').first().click();
    await expect(page.locator('.stage[data-revealed="1"]')).toBeVisible();
    await page.locator('.card3d[role="button"]').first().click();
    await expect(page.locator(".summary")).toBeVisible();
    await expect(page.locator(".summary__row")).toHaveCount(2);
    await expect(page.locator(".summary__row").nth(1)).toContainText("Carta de prueba 010");
    await page.click("text=← Volver a la colección");
  });

  await test.step("RF-21 y RF-8: publicar, congelar probabilidades y bloquear la colección", async () => {
    // Spec 017, RF-15: con las cartas armadas ya se puede publicar.
    await assembleSet(page, "E2E1");
    await page.reload();
    await expect(page.locator('[data-testid="not-assembled"]')).toHaveCount(0);
    await page.click("text=Comprobar y publicar");
    await page.click('[data-testid="confirm-accept"]');
    await expect(page.locator("text=Colección publicada. Sus probabilidades ya son públicas.")).toBeVisible();
    await expect(page.locator('[aria-label="Ranura 1, Común"]')).toBeDisabled();
    await expect(page.locator("text=Colección publicada: ya no se pueden añadir cartas (RF-8).")).toBeVisible();
    await expect(page.locator("text=Reordenar")).toHaveCount(0);
    const rates = await page.context().newPage();
    await rates.goto("/drop-rates");
    await expect(rates.locator("h2")).toContainText("Colección E2E");
    await rates.close();
  });

  await test.step("RF-25 y RF-27: regalar un sobre al usuario", async () => {
    await page.goto("/admin/users?q=fan-e2e");
    await page.click("a:text-is('fan-e2e')");
    await choose(page, "Colección", "E2E1 · Colección E2E");
    await page.fill('form:has(input[name="setId"]) input[name="reason"]', "Regalo del test E2E");
    await page.click("button:has-text('Regalar sobres')");
    await expect(page.locator("text=1 sobre regalado.")).toBeVisible();
    await expect(page.locator('[data-testid="sealed-packs"] h2')).toHaveText("Sobres sin abrir (1)");
  });
});
