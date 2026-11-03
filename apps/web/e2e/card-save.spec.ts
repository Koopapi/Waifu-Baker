// Criterios de la spec 027 (guardado claro del armador): un solo «Guardar» para la ficha y las capas, estado visible,
// la ventana no se cierra con cambios sin preguntar, borrador en el navegador y versiones de la carta.
import type { Page } from "@playwright/test";
import path from "node:path";
import { desktopOnly, expect, test } from "./fixtures";
import { LAB, createPublishedSet, login } from "./helpers";

async function openEditor(page: Page, setId: string, n = "001") {
  await page.goto(`/admin/sets/${setId}`);
  await page.click(`[aria-label="Editar carta ${n}"]`);
  await expect(page.locator('[data-testid="card-editor"]')).toBeVisible();
  await expect(page.locator('[data-testid="layers-editor"]')).toBeVisible();
}

const draftsInBrowser = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("wb:card-draft:")).length);

test("guardado claro del armador: un solo Guardar, cierre con pregunta, borrador y versiones", async ({ browser }) => {
  desktopOnly();
  const admin = await login(browser, "admin-guardado", true);
  const setId = await createPublishedSet(admin, "SAV1", ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);
  const editor = admin.locator('[data-testid="card-editor"]');
  const name = editor.locator('input[name="name"]');
  const status = admin.locator('[data-testid="save-status"]');
  const save = admin.locator('[data-testid="layers-save"]');

  await test.step("RF-4 y RF-5: sin cambios, el estado lo dice y «Guardar» está desactivado", async () => {
    await openEditor(admin, setId);
    await expect(status).toHaveAttribute("data-state", "clean");
    await expect(status).toContainText("Sin cambios");
    await expect(save).toBeDisabled();
  });

  await test.step("RF-1, RF-3 y RF-17: ficha y capas se guardan con un solo «Guardar» y la ventana sigue abierta", async () => {
    await name.fill("Carta guardada");
    await admin.locator('[data-testid="layers-editor"]').getByRole("button", { name: "Añadir partículas" }).click();
    await expect(status).toHaveAttribute("data-state", "dirty");
    await expect(status).toContainText("Cambios sin guardar");
    await save.click();
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("Capas guardadas");
    await expect(status).toHaveAttribute("data-state", "saved");
    await expect(status).toContainText("Guardado a las");
    await expect(editor).toBeVisible();
    await expect(save).toBeDisabled();
    // Las dos cosas quedaron guardadas.
    await admin.reload();
    await openEditor(admin, setId);
    await expect(name).toHaveValue("Carta guardada");
    await expect(admin.locator('[data-testid="layer-row"]')).toHaveCount(3);
  });

  await test.step("RF-6: con cambios sin guardar, ni Escape ni un clic fuera cierran la ventana", async () => {
    await name.fill("Cambio sin guardar");
    await expect(status).toHaveAttribute("data-state", "dirty");
    await admin.keyboard.press("Escape");
    await expect(editor).toBeVisible();
    await admin.mouse.click(4, 4);
    await expect(editor).toBeVisible();
  });

  await test.step("RF-7 y RF-8: cerrar pregunta; seguir editando no cierra y descartar cierra y vuelve a lo guardado", async () => {
    await admin.click('[data-testid="card-cancel"]');
    const dialog = admin.locator('[data-testid="confirm-dialog"]');
    await expect(dialog).toContainText("Tienes cambios sin guardar");
    await dialog.getByRole("button", { name: "Seguir editando" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(editor).toBeVisible();
    await expect(name).toHaveValue("Cambio sin guardar");
    await admin.click('[data-testid="card-cancel"]');
    await admin.locator('[data-testid="confirm-secondary"]').click();
    await expect(editor).toHaveCount(0);
    await expect.poll(() => draftsInBrowser(admin)).toBe(0);
    await openEditor(admin, setId);
    await expect(name).toHaveValue("Carta guardada");
  });

  await test.step("RF-9, RF-10, RF-11, RF-12 y RF-13: con cambios, salir avisa y, al volver, el borrador se ofrece y se recupera", async () => {
    await name.fill("Desde el borrador");
    // RF-10: el borrador se escribe solo, poco después del cambio.
    await expect.poll(() => draftsInBrowser(admin)).toBe(1);
    // RF-9: salir de la página con cambios pide confirmación al navegador.
    expect(
      await admin.evaluate(() => {
        const e = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(e);
        return e.defaultPrevented;
      }),
    ).toBe(true);
    await admin.reload();
    await openEditor(admin, setId);
    // RF-11: se ofrece, no se aplica solo.
    await expect(name).toHaveValue("Carta guardada");
    const offer = admin.locator('[data-testid="card-draft-offer"]');
    await expect(offer).toContainText("Hay un borrador del");
    await admin.click('[data-testid="draft-recover"]');
    // RF-12: cargado como cambios sin guardar.
    await expect(name).toHaveValue("Desde el borrador");
    await expect(status).toHaveAttribute("data-state", "dirty");
    await save.click();
    await expect(status).toHaveAttribute("data-state", "saved");
    // RF-13: al guardar, el borrador se borra.
    await expect.poll(() => draftsInBrowser(admin)).toBe(0);
  });

  await test.step("RF-19, RF-20 y RF-21: la lista de versiones, y volver a una anterior crea una versión nueva al guardar", async () => {
    await admin.click('[data-testid="versions-toggle"]');
    const rows = admin.locator('[data-testid="version-row"]');
    await expect(rows.first()).toContainText("por admin-guardado");
    await expect(rows.first()).toContainText("ficha");
    await expect(rows.nth(1)).toContainText("ficha y capas");
    const before = await rows.count();
    expect(before).toBeGreaterThanOrEqual(3);
    await expect(rows.first()).toContainText(`Versión ${before}`);
    // Volver a la versión de «Carta guardada»: cambios sin guardar; la carta no cambia hasta guardar.
    await rows.nth(1).locator('[data-testid="version-restore"]').click();
    await expect(admin.locator('[data-testid="layers-notice"]')).toContainText("cargada como cambios sin guardar");
    await expect(name).toHaveValue("Carta guardada");
    await expect(status).toHaveAttribute("data-state", "dirty");
    await save.click();
    await expect(status).toHaveAttribute("data-state", "saved");
    await expect(rows).toHaveCount(before + 1);
    await expect(rows.first()).toContainText(`Versión ${before + 1}`);
    await expect(rows.nth(2)).toContainText("ficha y capas");
  });

  await test.step("RF-14: si otro administrador guardó después de escribirse el borrador, se avisa y al guardarlo salta el conflicto", async () => {
    await name.fill("Borrador viejo");
    await expect.poll(() => draftsInBrowser(admin)).toBe(1);
    const other = await login(browser, "admin-guardado-2", true);
    await openEditor(other, setId);
    await other.locator('[data-testid="card-editor"] input[name="name"]').fill("Otro admin");
    await other.click('[data-testid="layers-save"]');
    await expect(other.locator('[data-testid="save-status"]')).toHaveAttribute("data-state", "saved");
    await admin.reload();
    await openEditor(admin, setId);
    await expect(name).toHaveValue("Otro admin");
    await expect(admin.locator('[data-testid="card-draft-offer"]')).toContainText("La carta cambió después de este borrador");
    await admin.click('[data-testid="draft-recover"]');
    await expect(name).toHaveValue("Borrador viejo");
    await save.click();
    await expect(admin.locator('[data-testid="layers-conflict"]')).toBeVisible();
    await admin.click('[data-testid="layers-reload"]');
    await expect(admin.locator('[data-testid="layers-conflict"]')).toHaveCount(0);
    await expect(name).toHaveValue("Otro admin");
    await expect(status).toHaveAttribute("data-state", "clean");
  });
});
