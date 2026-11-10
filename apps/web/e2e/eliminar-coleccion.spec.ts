// Criterios de finalización de la spec 032: la zona de peligro al final de la colección → el aviso con lo que se borra y
// el código para confirmar → eliminar y volver a «Sets» con el aviso → una colección con dueños no se elimina y ofrece
// archivar → un coleccionista no entra al panel. Las colecciones de bienvenida, portada y tier (RF-11 y RF-12) se
// prueban en integración y en el componente de los motivos, para no cambiar los ajustes globales de la base de E2E.
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, giftPacks, login } from "./helpers";

test("eliminar una colección desde el panel", async ({ browser }) => {
  test.setTimeout(240_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  const code = `DL${tag.slice(0, 2).toUpperCase()}${stamp}`;
  const owned = `DO${tag.slice(0, 2).toUpperCase()}${stamp}`;
  const fanName = `fan-dl-${tag}`;
  const admin = await login(browser, `admin-dl-${tag}`, true);
  const fan = await login(browser, fanName, false, "/packs");
  const images = ["01.webp", "02.webp"].map((f) => path.join(LAB, f));
  const setId = await createPublishedSet(admin, code, images, 2);
  const ownedId = await createPublishedSet(admin, owned, images, 2);
  await giftPacks(admin, fanName, owned, 1);

  await test.step("RF-1: la zona de peligro al final de la colección, con «Archivar» y «Eliminar colección»", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    const zone = admin.locator('[data-testid="danger-zone"]');
    await expect(zone).toBeVisible();
    await expect(zone.locator('[data-testid="archive-set"]')).toHaveText("Archivar colección");
    await expect(zone.locator('[data-testid="delete-set-open"]')).toHaveText("Eliminar colección");
    // Archivar ya no está junto a «Publicar».
    await expect(admin.locator('[data-testid="publish-panel"] [data-testid="archive-set"]')).toHaveCount(0);
  });

  await test.step("RF-2, RF-3 y RF-4: el aviso dice qué se borra, que no se puede deshacer, y pide el código", async () => {
    await admin.click('[data-testid="delete-set-open"]');
    const dialog = admin.locator('[data-testid="delete-set-dialog"]');
    await expect(dialog).toContainText(`Eliminar la colección ${code}`);
    // 2 cartas de las imágenes y la legendaria del sobre gold (helpers `createPublishedSet`).
    await expect(dialog.locator('[data-testid="delete-set-counts"]')).toContainText("Se borrarán 3 cartas");
    await expect(dialog).toContainText("No se puede deshacer.");
    const confirm = dialog.locator('[data-testid="delete-set-confirm"]');
    await expect(confirm).toBeDisabled();
    await dialog.locator('[data-testid="delete-set-code"]').fill(code.slice(0, -1));
    await expect(confirm).toBeDisabled();
    // En minúsculas y con espacios también vale.
    await dialog.locator('[data-testid="delete-set-code"]').fill(`  ${code.toLowerCase()} `);
    await expect(confirm).toBeEnabled();
  });

  await test.step("RF-5 y RF-6: eliminar vuelve a «Sets» con el aviso y la colección ya no está", async () => {
    await admin.click('[data-testid="delete-set-confirm"]');
    await admin.waitForURL(/\/admin\/sets$/);
    await expect(admin.getByText(`Colección ${code} eliminada.`)).toBeVisible();
    await expect(admin.locator(`a:text-is('${code}')`)).toHaveCount(0);
    // La página del panel ya empezó a cargar (pantalla de carga) cuando sabe que no existe: se comprueba el texto.
    await admin.goto(`/admin/sets/${setId}`);
    await expect(admin.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
  });

  await test.step("RF-9, RF-10 y RF-13: con dueños no se elimina, dice cuántos y ofrece archivar", async () => {
    await admin.goto(`/admin/sets/${ownedId}`);
    await admin.click('[data-testid="delete-set-open"]');
    const dialog = admin.locator('[data-testid="delete-set-dialog"]');
    await expect(dialog.locator('[data-testid="delete-set-owners"]')).toContainText("1 usuario recibió sobres o cartas de ella");
    await expect(dialog.locator('[data-testid="delete-set-code"]')).toHaveCount(0);
    await expect(dialog.locator('[data-testid="delete-set-confirm"]')).toHaveCount(0);
    await dialog.getByRole("button", { name: "Archivar colección" }).click();
    await admin.locator('[data-testid="confirm-dialog"]').getByRole("button", { name: "Archivar colección" }).click();
    await expect(admin.locator('[data-testid="delete-set-dialog"]')).toHaveCount(0);
    await expect(admin.locator("main")).toContainText("Colección archivada: no se concede");
  });

  await test.step("RF-15: un coleccionista no entra a la colección del panel", async () => {
    expect((await fan.goto(`/admin/sets/${ownedId}`))?.status()).toBe(404);
  });

  await admin.context().close();
  await fan.context().close();
});
