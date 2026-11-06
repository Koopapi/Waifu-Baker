// Criterios de la spec 028 (valores por defecto, ajustes del panel y cartas de portada): una carta nueva sale con el
// sello a 15 y el borde a 3,0 y «Aplicar estilo de la rareza» vuelve a ellos; los ajustes del panel cambian lo que se
// crea después; las probabilidades y garantías de las colecciones nuevas; las cartas de portada en la portada pública;
// la página de probabilidades con «al menos una por sobre» y la garantía de EX. El servidor de E2E corre en modo demo: su
// portada (la de la demo) enseña las mismas cartas de portada que la pública, con el mismo componente y la misma ruta.
import type { Page } from "@playwright/test";
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, login, setSlider } from "./helpers";

async function openEditor(page: Page, setId: string, n: string) {
  // Tras una subida la página se refresca sola; en WebKit ese refresco interrumpe un goto a la misma dirección. Si
  // pasa, la página ya llega a donde queríamos: se espera a que cargue.
  await page.goto(`/admin/sets/${setId}`).catch(async (e: Error) => {
    if (!/interrupted by another navigation/.test(e.message)) throw e;
    await page.waitForURL(`**/admin/sets/${setId}`);
    await page.waitForLoadState("networkidle");
  });
  await page.click(`[aria-label="Editar carta ${n}"]`);
  const editor = page.locator('[data-testid="layers-editor"]');
  await expect(editor).toBeVisible();
  return editor;
}

async function uploadOne(page: Page, image: string, total: number) {
  await page.setInputFiles('[data-testid="file-input"]', path.join(LAB, image));
  await expect(page.locator("text=/Subida terminada · 1 correcta/")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator("[data-card-tile]")).toHaveCount(total);
}

test("valores por defecto, ajustes del panel y cartas de portada", async ({ browser }) => {
  test.setTimeout(300_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const code = `VD${tag.slice(0, 4).toUpperCase()}`;
  const draft = `VB${tag.slice(0, 4).toUpperCase()}`;
  const admin = await login(browser, `admin-vd-${tag}`, true);
  // Publicada antes de tocar los ajustes: tablas y garantías de fábrica.
  const published = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  let draftId = "";

  await test.step("RF-1, RF-4 y RF-7: la chica subida crea la carta con el sello a 15 y el borde a 3,0", async () => {
    await admin.goto("/admin/sets");
    await admin.fill('input[name="code"]', draft);
    await admin.fill('form input[name="name"]', `Borrador ${draft}`);
    await admin.fill('input[name="packSize"]', "2");
    await admin.click("text=Crear colección");
    await expect(admin.locator(`text=Colección ${draft} creada en borrador.`)).toBeVisible();
    await admin.click(`a:text-is('${draft}')`);
    await admin.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
    draftId = admin.url().split("/").pop()!;
    await uploadOne(admin, "05.webp", 1);
    const editor = await openEditor(admin, draftId, "001");
    await expect(editor.locator('input[data-testid="layers-border"]')).toHaveValue("3");
    await expect(editor.locator('input[data-testid="seal-size"]')).toHaveValue("15");
    // La vista previa (carta-capas, la misma de la apertura, la ficha y la imagen fija) usa esos valores.
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card')).toHaveAttribute("style", /--cc-borde:\s*3cqw/);
    await expect(editor.locator('[data-testid="layers-preview"] .cc-sello')).toHaveAttribute("style", /--cc-sello-t:\s*15cqw/);
  });

  await test.step("RF-2: aplicar el estilo de la rareza vuelve a 15 y 3,0", async () => {
    const editor = admin.locator('[data-testid="layers-editor"]');
    await setSlider(editor.locator('input[data-testid="layers-border"]'), 4.6);
    await setSlider(editor.locator('input[data-testid="seal-size"]'), 22);
    await expect(editor.locator('input[data-testid="layers-border"]')).toHaveValue("4.6");
    await editor.locator('[data-testid="layers-apply-rarity"]').click();
    await expect(editor.locator('input[data-testid="layers-border"]')).toHaveValue("3");
    await expect(editor.locator('input[data-testid="seal-size"]')).toHaveValue("15");
  });

  await test.step("RF-15, RF-18 y RF-19: con otros valores en los ajustes, la carta nueva sale con ellos y la anterior no cambia", async () => {
    await admin.goto("/admin/settings");
    const form = admin.locator('[data-testid="card-defaults-form"]');
    await setSlider(form.locator('input[data-testid="default-seal-size"]'), 20);
    await setSlider(form.locator('input[data-testid="default-border"]'), 4.5);
    await form.locator('[data-testid="card-defaults-save"]').click();
    await expect(form.getByText("Valores de las cartas guardados.")).toBeVisible();
    await admin.goto(`/admin/sets/${draftId}`);
    await uploadOne(admin, "06.webp", 2);
    let editor = await openEditor(admin, draftId, "002");
    await expect(editor.locator('input[data-testid="layers-border"]')).toHaveValue("4.5");
    await expect(editor.locator('input[data-testid="seal-size"]')).toHaveValue("20");
    editor = await openEditor(admin, draftId, "001");
    await expect(editor.locator('input[data-testid="layers-border"]')).toHaveValue("3");
    await expect(editor.locator('input[data-testid="seal-size"]')).toHaveValue("15");
  });

  await test.step("RF-16: una fila que no suma 100 no se guarda y dice cuál falla", async () => {
    await admin.goto("/admin/settings");
    const form = admin.locator('[data-testid="odds-defaults-form"]');
    const row = form.locator('[data-testid="odds-defaults-silver-base"]');
    await row.getByLabel("Sobre plata: Ranuras normales, Común").fill("70");
    await expect(row).toHaveAttribute("data-invalid", "true");
    await form.locator('[data-testid="odds-defaults-save"]').click();
    await expect(form.getByText("Sobre plata, ranuras normales: suma 98 % en vez de 100 %. No se guardó nada.")).toBeVisible();
    await row.getByLabel("Sobre plata: Ranuras normales, Rara").fill("24");
    await expect(row).not.toHaveAttribute("data-invalid", "true");
    await form.locator('[data-testid="odds-defaults-save"]').click();
    await expect(form.getByText("Probabilidades guardadas.")).toBeVisible();
  });

  await test.step("RF-8, RF-9, RF-17 y RF-18: la colección nueva propone las probabilidades y garantías de los ajustes", async () => {
    const form = admin.locator('[data-testid="pity-defaults-form"]');
    await form.locator('input[data-testid="default-pity-ex"]').fill("25");
    await form.locator('[data-testid="pity-defaults-save"]').click();
    await expect(form.getByText("Garantías guardadas.")).toBeVisible();
    const fresh = `VN${tag.slice(0, 4).toUpperCase()}`;
    await admin.goto("/admin/sets");
    await admin.fill('input[name="code"]', fresh);
    await admin.fill('form input[name="name"]', `Nueva ${fresh}`);
    await admin.fill('input[name="packSize"]', "3");
    await admin.click("text=Crear colección");
    await expect(admin.locator(`text=Colección ${fresh} creada en borrador.`)).toBeVisible();
    await admin.click(`a:text-is('${fresh}')`);
    await admin.waitForURL(/\/admin\/sets\/[0-9a-f-]+$/);
    const silver = admin.locator('[data-testid="odds-silver"]');
    await expect(silver.getByLabel("Ranura 1, Común")).toHaveValue("70");
    await expect(silver.getByLabel("Ranura 1, Rara")).toHaveValue("24");
    await expect(silver.getByLabel("Ranura 3, EX")).toHaveValue("0.2");
    await expect(silver.locator('input[data-testid="odds-pity-silver"]')).toHaveValue("10");
    await admin.getByRole("tab", { name: "Gold" }).click();
    const gold = admin.locator('[data-testid="odds-gold"]');
    await expect(gold.getByLabel("Ranura 3, Épica")).toHaveValue("72");
    await expect(gold.locator('input[data-testid="odds-pity-gold"]')).toHaveValue("25");
  });

  await test.step("RF-23: sin cartas de portada, la portada no muestra el abanico", async () => {
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto("/");
    await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(visitor.locator('[data-testid="cover-fan"]')).toHaveCount(0);
    await visitor.context().close();
  });

  await test.step("RF-20: el administrador elige 3 cartas de portada de una colección publicada y su orden", async () => {
    await admin.goto("/admin/settings");
    const form = admin.locator('[data-testid="cover-cards-form"]');
    // Solo salen las de colecciones publicadas (la de borrador no).
    for (const n of ["001", "002", "003"]) await choose(form, "Añadir una carta", new RegExp(`${code} · ${n}`));
    await expect(form.locator('[data-testid="cover-item"]')).toHaveCount(3);
    await form.getByRole("button", { name: new RegExp(`^Mover ${code} · 003 .* a la izquierda$`) }).click();
    await expect(form.locator('[data-testid="cover-item"]').nth(1)).toContainText(`${code} · 003`);
    await form.locator('[data-testid="cover-cards-save"]').click();
    await expect(form.getByText("Cartas de portada guardadas.")).toBeVisible();
  });

  await test.step("RF-21: la portada pública muestra las cartas en abanico con su imagen pública, con sesión y sin ella", async () => {
    const visitor = await (await browser.newContext()).newPage();
    const fan = await login(browser, `fan-vd-${tag}`, false, "/");
    for (const page of [visitor, fan]) {
      await page.goto("/");
      const imgs = page.locator('[data-testid="cover-fan"] img');
      await expect(imgs).toHaveCount(3);
      for (const img of await imgs.all()) {
        await expect(img).toHaveAttribute("src", /^\/api\/cover\/[0-9a-f-]{36}$/);
        await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      }
    }
    // La imagen que sirve es la pública con marca de agua (600 × 840).
    const src = await visitor.locator('[data-testid="cover-fan"] img').first().getAttribute("src");
    const res = await visitor.request.get(src!);
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("public");
    await visitor.context().close();
    await fan.context().close();
  });

  await test.step("RF-11 y RF-14: probabilidades públicas con «al menos una por sobre» y la garantía de EX", async () => {
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto("/drop-rates");
    await expect(visitor.locator(`[data-testid="ex-pity-${code}"]`)).toContainText("si abres 19 sobres gold seguidos");
    const silver = visitor.locator(`[data-testid="at-least-one-${code}-silver"]`);
    await expect(silver.locator('[data-rarity="common"]')).toHaveText("100 %");
    await expect(silver.locator('[data-rarity="legendary"]')).toHaveText("—");
    await expect(visitor.locator(`[data-testid="at-least-one-${code}-gold"] [data-rarity="legendary"]`)).toHaveText("100 %");
    expect(published).toBeTruthy();
    await visitor.context().close();
  });
});
