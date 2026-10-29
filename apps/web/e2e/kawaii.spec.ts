// Criterios de finalización de la spec 014: sobre compuesto y su portada elegida en el panel (y un sobre hecho a mano)
// → abrir un sobre con agitado, brillo de rareza, confeti y resumen → recompensas con anillo y racha sin desbordes →
// colección con portada y datos → plurales, pegatinas y contador de copias sin tapar el símbolo.
import type { Locator, Page } from "@playwright/test";
import path from "node:path";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { choose, createPublishedSet, dismissTop, giftPacks, LAB, login, revealTop, tear } from "./helpers";

const es = dictionaries.es;

const shot = (p: Page, name: string) => p.screenshot({ path: `test-results/screens/${test.info().project.name}/s014-${name}.png` });

/** Dos cajas no se cruzan. */
async function apart(a: Locator, b: Locator) {
  const [x, y] = [await a.boundingBox(), await b.boundingBox()];
  if (!x || !y) return true;
  return x.x + x.width <= y.x || y.x + y.width <= x.x || x.y + x.height <= y.y || y.y + y.height <= x.y;
}

test("demo kawaii: sobres, apertura con suspense, recompensas y colección", async ({ browser }) => {
  const admin = await login(browser, "admin-kawaii", true);
  // 3 cartas: 001 y 002 comunes y 003 rara; cada sobre trae 2 cartas, la segunda rara.
  // Spec 021: gratuita, como la colección de fan art de la demo (sale en las recompensas y sin aviso de Patreon).
  const setId = await createPublishedSet(admin, "KAW1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3, undefined, false, true);
  await giftPacks(admin, "fan-kawaii", "KAW1", 3);
  const fan = await login(browser, "fan-kawaii", false, "/packs");

  await test.step("RF-6: el administrador elige la portada del sobre", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    const box = admin.locator('[data-testid="pack-settings"]');
    await expect(box.locator('[role="img"]')).toBeVisible();
    await choose(box, es.admin.set.pack.cover, /^001 ·/);
    await expect(admin.getByText(es.admin.set.pack.coverSaved)).toBeVisible();
  });

  await test.step("RF-5, RF-8 y RF-19: «Mis sobres» muestra el sobre compuesto con la portada y el plural correcto", async () => {
    await fan.goto("/packs");
    await expect(fan.getByText("Tienes 3 sobres sin abrir.")).toBeVisible();
    // Spec 023: el sobre nuevo (`PackShell`) con la portada en su ventana y una línea de dientes.
    const art = fan.locator('[data-testid="group-KAW1"] .pack-shell');
    await expect(art.locator('img[src*="k=cover"]')).toBeVisible();
    await expect.poll(() => art.locator("img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await expect(art.locator(".pack-shell__teeth")).toHaveCount(1);
    // El texto de los botones de apertura cabe en el botón, también en pantalla ancha (dos columnas de tarjetas).
    const fits = async () => {
      const buttons = await fan.locator('[data-testid="group-KAW1"] a').all();
      expect(buttons).toHaveLength(2);
      for (const b of buttons) expect(await b.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    };
    await fits();
    await shot(fan, "1-mis-sobres");
    if (!test.info().project.use.isMobile) {
      const size = fan.viewportSize();
      await fan.setViewportSize({ width: 1440, height: 900 });
      await fits();
      if (size) await fan.setViewportSize(size);
    }
  });

  await test.step("RF-7: un sobre hecho a mano sustituye al compuesto y se puede quitar", async () => {
    await admin.locator('[data-testid="pack-image-input"]').setInputFiles(path.join(LAB, "05.webp"));
    await expect(admin.getByText(es.admin.set.pack.uploaded)).toBeVisible();
    await fan.goto("/packs");
    await expect(fan.locator('[data-testid="group-KAW1"] .pack-shell__window img[src*="k=pack"]')).toBeVisible();
    await admin.getByRole("button", { name: es.admin.set.pack.remove }).click();
    await expect(admin.getByText(es.admin.set.pack.removed)).toBeVisible();
    await fan.goto("/packs");
    await expect(fan.locator('[data-testid="group-KAW1"] .pack-shell__window img[src*="k=pack"]')).toHaveCount(0);
  });

  await test.step("RF-1 a RF-4 y RF-24: estilo kawaii con pegatinas y botones con relieve", async () => {
    await expect(fan.locator('nav [data-sticker="pack"]').first()).toBeVisible();
    const btn = fan.locator('[data-testid="group-KAW1"]').getByRole("link", { name: es.packs.mine.openOne });
    await expect(btn).toHaveClass(/rounded-full/);
    await admin.goto("/admin");
    await expect(admin.locator("[data-sticker], svg").first()).toBeVisible();
  });

  await test.step("RF-8, RF-9, RF-11 y RF-15: la apertura con el sobre de la colección, destellos y agitado", async () => {
    await fan.locator('[data-testid="group-KAW1"]').getByRole("link", { name: es.packs.mine.openOne }).click();
    // Spec 023: el sobre nuevo (con la imagen de la colección) se agita al tocar la tira sin arrastrar.
    await expect(fan.locator('[data-testid="tear-pack"] .pack-shell')).toBeVisible();
    await expect(fan.locator(".sparkle").first()).toBeAttached();
    await fan.waitForLoadState("networkidle");
    if (!(await fan.locator(".tear--reduced").count())) {
      await fan.locator(".tear__hit").click();
      await expect(fan.locator(".tear--shake")).toBeAttached();
    }
    // El texto de ayuda no se monta sobre el selector de idioma ni sobre los botones.
    const hint = fan.locator(".hint");
    expect(await apart(hint, fan.locator('[data-testid="locale-toggle"]').first())).toBe(true);
    for (const b of await fan.locator(".hud > *").all()) expect(await apart(hint, b)).toBe(true);
    await shot(fan, "2-sobre");
  });

  await test.step("RF-9, RF-10, RF-12 a RF-14: dorso kawaii, brillo antes de la rara, confeti y resumen con miniaturas", async () => {
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="deck"]')).toBeVisible();
    await expect(fan.locator(".card3d__backart b").first()).toHaveText("WB");
    // Primera carta (común, el mazo va de menor a mayor rareza): sin brillo ni confeti.
    await expect(fan.locator(".card3d--tease")).toHaveCount(0);
    await revealTop(fan);
    // Sin recuadro de foco al tocar.
    expect(await fan.locator(".card3d").first().evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");
    await dismissTop(fan);
    // Segunda carta (rara): brilla antes de voltearse y lanza confeti al revelarse.
    await expect(fan.locator(".card3d--tease")).toHaveCount(1);
    await shot(fan, "3-brillo");
    await revealTop(fan);
    const reduced = test.info().project.name === "reduced-motion";
    if (!reduced) await expect(fan.locator('[data-testid="confetti"]')).toBeAttached();
    await expect(fan.locator('[data-testid="celebration"]')).toHaveCount(0);
    await dismissTop(fan);
    await expect(fan.locator(".summary")).toBeVisible();
    await expect(fan.locator(".summary__thumb img")).toHaveCount(2);
    await expect(fan.locator(".summary__row").first()).toContainText("¡Nueva!");
    await shot(fan, "4-resumen");
  });

  await test.step("RF-8: «Abrir todos» muestra el mismo sobre", async () => {
    await fan.goto(`/packs/${setId}/all`);
    await expect(fan.locator(".pack-shell img[src*='k=cover']")).toBeVisible();
  });

  await test.step("RF-16 y RF-17: recompensas con anillo y racha de pegatinas sin desbordes", async () => {
    await fan.goto("/rewards");
    await expect(fan.locator('[data-testid="free-pack"] [role="progressbar"]')).toBeVisible();
    const days = fan.locator('[data-testid="streak"] li');
    await expect(days).toHaveCount(7);
    for (const d of await days.all()) expect(await d.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(fan.locator('[data-testid="streak"] [data-sticker="cookie"]').first()).toBeVisible();
    await shot(fan, "5-recompensas");
    await fan.goto("/packs");
    await expect(fan.locator('[role="progressbar"]').first()).toBeVisible();
    // En WebKit, «Mis sobres» aún puede estar recargando (marca los sobres como vistos) y cortaría la navegación siguiente.
    await fan.waitForLoadState("networkidle");
  });

  await test.step("RF-18 y RF-20: «Mi colección» con portada y datos; el contador no tapa el símbolo", async () => {
    await fan.goto("/collection");
    const col = fan.locator('[data-testid="collection-KAW1"]');
    await expect(col.locator('img[src*="k=cover"]')).toBeVisible();
    await expect(col).toContainText(es.collection.stats.best);
    await expect(col.locator("li img")).not.toHaveCount(0);
    await shot(fan, "6-coleccion");
    await col.locator("a").click();
    const card = fan.locator('[data-testid="binder-grid"] li:not([data-missing]) button').first();
    const copies = card.locator('[data-testid="copies"]');
    await expect(copies).toBeVisible();
    // El símbolo de la colección va en la esquina superior derecha de la carta (el 30 % de arriba a la derecha).
    const [c, b] = [(await card.boundingBox())!, (await copies.boundingBox())!];
    const corner = { x: c.x + c.width * 0.7, y: c.y, width: c.width * 0.3, height: c.height * 0.3 };
    expect(b.x + b.width <= corner.x || b.y >= corner.y + corner.height).toBe(true);
  });
});
