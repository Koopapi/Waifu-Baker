// Criterios de la spec 011: sistema de diseño (catálogo /sistema, teclado, foco, avisos, confirmación, movimiento).
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";

const es = dictionaries.es;

test("sistema de diseño: catálogo, teclado, superposiciones, avisos y acciones optimistas", async ({ browser }, info) => {
  test.setTimeout(240_000);
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sistema");
  await expect(page.locator('[data-testid="catalog"]')).toBeVisible();

  await test.step("RF-15: el catálogo muestra todas las familias de componentes", async () => {
    for (const s of ["action", "form", "feedback", "overlay", "content", "game", "optimistic"]) {
      await expect(page.locator(`[data-testid="catalog-${s}"]`)).toBeVisible();
    }
  });

  await test.step("RF-3: botones con variantes y estados", async () => {
    const action = page.locator('[data-testid="catalog-action"]');
    await expect(action.locator("button")).toHaveCount(10);
    await expect(action.locator('button[aria-busy="true"]')).toBeDisabled();
    await expect(action.locator('button:has-text("Disabled")')).toBeDisabled();
    await expect(action.locator('button[aria-label="Settings"]')).toBeVisible();
  });

  await test.step("RF-4 y RF-14: desplegable con buscador usable solo con teclado", async () => {
    const combo = page.locator('[data-testid="catalog-form"] button[role="combobox"]');
    // Hasta que la página se hidrata, el botón no responde al teclado: se repite el gesto hasta que abre.
    await expect(async () => {
      await combo.focus();
      await page.keyboard.press("Enter");
      await expect(combo).toHaveAttribute("aria-expanded", "true", { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await page.keyboard.type("07");
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-testid="catalog-select-value"]')).toHaveText("Selected: s7");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    // Al cerrarse, el desplegable devuelve el foco a su botón (un instante después).
    await expect(combo).toBeFocused();
    const sw = page.locator('[data-testid="catalog-form"] button[role="switch"]');
    await sw.focus();
    await expect(sw).toBeFocused();
    await page.keyboard.press("Space");
    await expect(sw).toHaveAttribute("aria-checked", "true");
  });

  await test.step("RF-6 y RF-14: el modal atrapa el foco, Escape lo cierra y el foco vuelve", async () => {
    const opener = page.locator('[data-testid="open-modal"]');
    await opener.focus();
    await page.keyboard.press("Enter");
    const modal = page.locator('[data-testid="modal"]');
    await expect(modal).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await modal.evaluate((m) => m.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await expect(opener).toBeFocused();
  });

  await test.step("RF-6: menú contextual con teclado", async () => {
    await page.click('[data-testid="open-menu"]');
    await expect(page.locator('[data-testid="menu"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="menu"]')).toBeHidden();
  });

  await test.step("RF-12: confirmación propia con el botón de peligro", async () => {
    await page.click('[data-testid="open-confirm"]');
    const dialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(dialog).toHaveAttribute("role", "alertdialog");
    await page.click('[data-testid="confirm-accept"]');
    await expect(page.locator('[data-testid="confirm-result"]')).toHaveText("Answer: yes");
    await page.click('[data-testid="open-confirm"]');
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="confirm-result"]')).toHaveText("Answer: no");
  });

  await test.step("RF-5 y RF-11: aviso con deshacer", async () => {
    await page.click('[data-testid="toast-undo"]');
    await page.click('[data-testid="toast-action"]');
    await expect(page.locator('[data-testid="toast"]:has-text("Restored")')).toBeVisible();
  });

  await test.step("RF-10: la acción optimista se ve al instante y, si falla, se deshace con reintentar", async () => {
    const ok = page.locator('[data-testid="optimistic-ok"]');
    await ok.click();
    await expect(ok).toHaveText(/\(1\)/, { timeout: 300 });
    await page.click('[data-testid="optimistic-fail"]');
    const err = page.locator('[data-testid="toast"][data-kind="error"]:has-text("The server said no")');
    await expect(err).toBeVisible();
    await expect(err.locator('[data-testid="toast-action"]')).toHaveText(es.common.retry);
  });

  await test.step("RF-8: contador animado y vista a pantalla completa", async () => {
    await page.click('[data-testid="counter-add"]');
    await expect(page.locator('[data-testid="catalog-game"]')).toContainText("280");
    await page.click('[data-testid="open-focus"]');
    const focus = page.locator('[data-testid="focus-view"]');
    await expect(focus).toBeVisible();
    const box = (await focus.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(Math.round(box.width)).toBe(vp.width);
    expect(Math.round(box.height)).toBe(vp.height);
    await page.keyboard.press("Escape");
    await expect(focus).toBeHidden();
  });

  await test.step("RF-13: animaciones cortas, y ninguna con movimiento reducido", async () => {
    await page.click('[data-testid="open-modal"]');
    const d = await page.locator('[data-testid="modal"]').evaluate((m) => parseFloat(getComputedStyle(m).animationDuration));
    if (info.project.name === "reduced-motion") expect(d).toBeLessThan(0.01);
    else {
      expect(d).toBeGreaterThanOrEqual(0.15);
      expect(d).toBeLessThanOrEqual(0.25);
    }
    await page.keyboard.press("Escape");
  });
});
