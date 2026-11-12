// Criterios de finalización de la spec 033: filtrar por personaje y por rareza con el contador → buscar → ordenar →
// pendientes sin resultados y «Quitar filtros» → seleccionar las visibles y cambiarlas en bloque sin perder el filtro →
// recargar con los filtros en la dirección → entrar desde «Sets» sin filtros → «Reordenar» quita los filtros (borrador).
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, login, tick } from "./helpers";

const tiles = (p: Page) => p.locator('[data-testid="card-grid"] [data-card-tile]');
const numbers = async (p: Page) => (await tiles(p).evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-card-tile"))))) as number[];
// Spec 038: el nombre exacto (como texto, «Rare» también encontraría «Ultra Rare»). La ficha puede llevar su recuento.
const chip = (p: Page, group: string, name: string | RegExp) =>
  p.locator(`[data-testid="filter-${group}"] button`, { hasText: typeof name === "string" ? new RegExp(`^${name}(\\s*\\d+)?$`) : name });

test("filtros, búsqueda y orden de las cartas de una colección", async ({ browser }) => {
  test.setTimeout(300_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  const code = `FL${tag.slice(0, 2).toUpperCase()}${stamp}`;
  const second = `Segunda ${code}`;
  const admin = await login(browser, `admin-fl-${tag}`, true);
  // 001 y 002 comunes, 003 rara y 004 legendaria (la del sobre gold), todas de «Personaje <código>».
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await admin.goto("/admin/characters");
  await admin.fill('form:has-text("Nuevo personaje") input[name="name"]', second);
  await admin.click("text=Crear personaje");
  await expect(admin.locator(`text=Personaje «${second}» creado.`)).toBeVisible();
  await admin.goto(`/admin/sets/${setId}`);
  await tick(admin, "Seleccionar carta 002");
  await choose(admin, "Personaje para la selección", second);
  await admin.click("text=Aplicar a la selección");
  await expect(admin.locator("text=1 carta actualizada.")).toBeVisible({ timeout: 30_000 });
  await expect(chip(admin, "character", second)).toContainText("1");

  await test.step("RF-1, RF-4 y RF-8: filtrar por personaje, con los recuentos y el contador", async () => {
    await expect(chip(admin, "character", `Personaje ${code}`)).toContainText("3");
    await expect(admin.locator('[data-testid="filters-count"]')).toHaveText("");
    await chip(admin, "character", second).click();
    await expect(chip(admin, "character", second)).toHaveAttribute("aria-pressed", "true");
    expect(await numbers(admin)).toEqual([2]);
    await expect(admin.locator('[data-testid="filters-count"]')).toHaveText("1 de 4");
    await admin.click('[data-testid="filters-clear"]');
    await expect(tiles(admin)).toHaveCount(4);
  });

  await test.step("RF-2, RF-5 y RF-6: varias rarezas suman y se combinan con el personaje", async () => {
    await chip(admin, "rarity", "Common").click();
    await chip(admin, "rarity", "Rare").click();
    await expect(tiles(admin)).toHaveCount(3);
    await chip(admin, "character", `Personaje ${code}`).click();
    await expect.poll(() => numbers(admin)).toEqual([1, 3]);
    await admin.click('[data-testid="filters-clear"]');
  });

  await test.step("RF-7: buscar por número o por nombre", async () => {
    await admin.fill('[data-testid="filters-search"]', "003");
    await expect.poll(() => numbers(admin)).toEqual([3]);
    await admin.fill('[data-testid="filters-search"]', "carta GOLD");
    await expect.poll(() => numbers(admin)).toEqual([4]);
    await admin.fill('[data-testid="filters-search"]', "");
    await expect(tiles(admin)).toHaveCount(4);
  });

  await test.step("RF-10: ordenar por rareza, de la más alta a la más baja", async () => {
    await choose(admin, "Ordenar", "Ordenar: Rareza");
    await expect.poll(() => numbers(admin)).toEqual([4, 3, 1, 2]);
    await choose(admin, "Ordenar", "Ordenar: Número");
    await expect.poll(() => numbers(admin)).toEqual([1, 2, 3, 4]);
  });

  await test.step("RF-3 y RF-9: un pendiente sin cartas deja la cuadrícula vacía con «Quitar filtros»", async () => {
    await expect(chip(admin, "pending", "Sin armar")).toContainText("0");
    await expect(chip(admin, "pending", "18+ sin revisar")).toHaveCount(0);
    await chip(admin, "pending", "Sin armar").click();
    await expect(tiles(admin)).toHaveCount(0);
    await expect(admin.getByText("No hay cartas con esos filtros.")).toBeVisible();
    await admin.click('[data-testid="filters-empty-clear"]');
    await expect(tiles(admin)).toHaveCount(4);
  });

  await test.step("RF-12, RF-13 y RF-15: seleccionar las visibles, cambiarlas en bloque y conservar el filtro", async () => {
    await chip(admin, "rarity", "Common").click();
    await admin.getByRole("button", { name: "Seleccionar las 2 visibles" }).click();
    await expect(admin.locator('[data-card-tile] input[type="checkbox"]:checked')).toHaveCount(2);
    // Lo que deja de verse sale de la selección.
    await chip(admin, "rarity", "Common").click();
    await chip(admin, "rarity", "Rare").click();
    await expect(admin.getByText("0 de 4 seleccionadas")).toBeVisible();
    await chip(admin, "rarity", "Rare").click();
    await chip(admin, "rarity", "Common").click();
    await admin.getByRole("button", { name: "Seleccionar las 2 visibles" }).click();
    await choose(admin, "Personaje para la selección", second);
    await admin.click("text=Aplicar a la selección");
    await expect(admin.locator("text=2 cartas actualizadas.")).toBeVisible({ timeout: 30_000 });
    await expect(chip(admin, "rarity", "Common")).toHaveAttribute("aria-pressed", "true");
    await expect(chip(admin, "character", second)).toContainText("2");
    expect(await numbers(admin)).toEqual([1, 2]);
  });

  await test.step("RF-16 y RF-17: los filtros van en la dirección, sin llenar el historial, y vuelven al recargar", async () => {
    const before = await admin.evaluate(() => history.length);
    await admin.fill('[data-testid="filters-search"]', "carta");
    await expect(admin).toHaveURL(/rarity=common&q=carta/);
    expect(await admin.evaluate(() => history.length)).toBe(before);
    await admin.reload();
    await expect(chip(admin, "rarity", "Common")).toHaveAttribute("aria-pressed", "true");
    await expect(admin.locator('[data-testid="filters-search"]')).toHaveValue("carta");
    expect(await numbers(admin)).toEqual([1, 2]);
  });

  await test.step("RF-19: al entrar desde «Sets», sin filtros", async () => {
    await admin.goto("/admin/sets");
    await admin.click(`a:text-is('${code}')`);
    await admin.waitForURL(new RegExp(`/admin/sets/${setId}$`));
    await expect(tiles(admin)).toHaveCount(4);
    await expect(admin.locator('[data-testid="filter-rarity"] button[aria-pressed="true"]')).toHaveCount(0);
  });

  await test.step("RF-14: «Reordenar» quita los filtros y muestra toda la colección", async () => {
    const draft = `FD${tag.slice(0, 2).toUpperCase()}${stamp}`;
    await admin.goto("/admin/sets");
    await admin.fill('input[name="code"]', draft);
    await admin.fill('form input[name="name"]', `Borrador ${draft}`);
    await admin.click("text=Crear colección");
    await expect(admin.locator(`text=Colección ${draft} creada en borrador.`)).toBeVisible();
    await admin.click(`a:text-is('${draft}')`);
    await admin.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
    await admin.setInputFiles('[data-testid="file-input"]', ["01.webp", "02.webp"].map((f) => path.join(LAB, f)));
    await expect(admin.locator("text=Subida terminada · 2 correctas")).toBeVisible({ timeout: 90_000 });
    await admin.fill('[data-testid="filters-search"]', "002");
    await expect(tiles(admin)).toHaveCount(1);
    await admin.getByRole("button", { name: "Reordenar" }).click();
    await expect(tiles(admin)).toHaveCount(2);
    await expect(admin).not.toHaveURL(/\?/);
    await admin.getByRole("button", { name: "Terminar" }).click();
    await expect(admin.locator('[data-testid="filters-search"]')).toHaveValue("");
  });

  await admin.context().close();
});
