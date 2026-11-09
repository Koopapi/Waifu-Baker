// Criterios de finalización de la spec 031: entrar a una colección sin el editor, sin las capas y sin la biblioteca →
// miniaturas diferidas → abrir una carta (ventana al instante con miniatura e indicador, después el editor) → otra carta
// sin volver a descargar el editor → error con «Reintentar» → cerrar mientras carga sin avisos → guardar y ver la
// miniatura nueva. El administrador entra siempre en escritorio (helpers `login`).
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, login } from "./helpers";

test("carga diferida en la página de una colección", async ({ browser }) => {
  test.setTimeout(240_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const code = `CD${tag.slice(0, 4).toUpperCase()}`;
  const admin = await login(browser, `admin-cd-${tag}`, true);
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  const layerKeys = new RegExp(`sets/${setId}/layers/[0-9a-f]{64}`);
  const libraryKeys = /library\/[0-9a-f]{64}\.webp/;

  await test.step("RF-1, RF-2 y RF-3: la colección llega sin el editor, sin las capas y sin la biblioteca", async () => {
    // La página completa (HTML con los datos del router) y la respuesta de navegación (RSC).
    const html = await (await admin.request.get(`/admin/sets/${setId}`)).text();
    const rsc = await (await admin.request.get(`/admin/sets/${setId}?_rsc=cd`, { headers: { RSC: "1" } })).text();
    for (const body of [html, rsc]) {
      expect(body).not.toMatch(layerKeys);
      expect(body).not.toMatch(libraryKeys);
    }
    await admin.goto(`/admin/sets/${setId}`);
    await expect(admin.locator("[data-card-tile]")).toHaveCount(3);
    // Sin abrir ninguna carta, la ventana del editor no existe.
    await expect(admin.locator('[data-testid="layers-editor"]')).toHaveCount(0);
  });

  await test.step("RF-6 y RF-7: todas las cartas en la cuadrícula, con las miniaturas diferidas", async () => {
    const imgs = admin.locator('[data-testid="card-grid"] [data-card-tile] img');
    await expect(imgs).toHaveCount(3);
    for (const img of await imgs.all()) await expect(img).toHaveAttribute("loading", "lazy");
  });

  // Peticiones del código del editor (los trozos de JavaScript que se descargan al abrir una carta).
  const scripts: string[] = [];
  admin.on("request", (r) => {
    if (r.resourceType() === "script") scripts.push(r.url());
  });

  await test.step("RF-8 y RF-9: la ventana abre al instante con la miniatura y el indicador, y luego el editor", async () => {
    // La carta se retiene medio segundo para ver la ventana mientras carga.
    await admin.route(`**/api/admin/cards/*`, async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await new Promise((r) => setTimeout(r, 500));
      await route.fallback();
    });
    await admin.click('[aria-label="Editar carta 001"]');
    const loading = admin.locator('[data-testid="card-editor-loading"]');
    await expect(loading).toBeVisible();
    await expect(loading.locator('[data-testid="card-editor-loading-thumb"]')).toBeVisible();
    await expect(loading.locator('[data-testid="card-editor-spinner"]')).toContainText("Cargando el editor de la carta");
    const editor = admin.locator('[data-testid="layers-editor"]');
    await expect(editor).toBeVisible();
    await expect(editor.locator('[data-testid="layers-preview"] .cc-card')).toBeVisible();
    // La biblioteca llegó: el fondo de las colecciones de prueba se puede elegir.
    await expect(editor.getByRole("button", { name: "Usar el fondo Fondo de prueba" })).toBeVisible();
    await admin.unroute(`**/api/admin/cards/*`);
    await admin.click('[data-testid="card-cancel"]');
    await expect(editor).toHaveCount(0);
  });

  await test.step("RF-10: otra carta no vuelve a descargar el editor", async () => {
    const before = scripts.length;
    const libraryCalls: string[] = [];
    const onReq = (r: { url: () => string }) => r.url().endsWith("/api/admin/library") && libraryCalls.push(r.url());
    admin.on("request", onReq);
    await admin.click('[aria-label="Editar carta 002"]');
    await expect(admin.locator('[data-testid="layers-editor"]')).toBeVisible();
    expect(scripts.length).toBe(before);
    expect(libraryCalls).toHaveLength(0);
    admin.off("request", onReq);
    await admin.click('[data-testid="card-cancel"]');
  });

  await test.step("RF-11: si la carta no carga, avisa y «Reintentar» la vuelve a pedir", async () => {
    let fail = true;
    await admin.route(`**/api/admin/cards/*`, async (route) => {
      if (route.request().method() === "GET" && fail) {
        fail = false;
        return route.fulfill({ status: 500, body: "error" });
      }
      await route.fallback();
    });
    await admin.click('[aria-label="Editar carta 003"]');
    const error = admin.locator('[data-testid="card-editor-error"]');
    await expect(error).toContainText("No se pudo cargar la carta");
    await error.locator('[data-testid="card-editor-retry"]').click();
    await expect(admin.locator('[data-testid="layers-editor"]')).toBeVisible();
    await admin.unroute(`**/api/admin/cards/*`);
    await admin.click('[data-testid="card-cancel"]');
  });

  await test.step("RF-12: cerrar mientras carga no deja avisos", async () => {
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await admin.route(`**/api/admin/cards/*`, async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await held;
      await route.fallback().catch(() => {});
    });
    await admin.click('[aria-label="Editar carta 001"]');
    const loading = admin.locator('[data-testid="card-editor-loading"]');
    await expect(loading).toBeVisible();
    await admin.keyboard.press("Escape");
    await expect(loading).toHaveCount(0);
    release();
    await admin.waitForTimeout(500);
    await expect(admin.locator('[data-testid="card-editor-error"], [data-testid="layers-editor"]')).toHaveCount(0);
    await admin.unroute(`**/api/admin/cards/*`);
  });

  await test.step("RF-13 y RF-14: guardar una carta actualiza su miniatura en la cuadrícula", async () => {
    const thumb = admin.locator('[data-card-tile="1"] img');
    const before = await thumb.getAttribute("src");
    await admin.click('[aria-label="Editar carta 001"]');
    const editor = admin.locator('[data-testid="layers-editor"]');
    await expect(editor).toBeVisible();
    await admin.fill('input[name="name"]', "Carta diferida");
    await admin.click('[data-testid="layers-save"]');
    await expect(admin.locator('[data-testid="card-save-bar"]')).toContainText(/Guardado a las/);
    await admin.click('[data-testid="card-cancel"]');
    await expect(admin.locator('[data-card-tile="1"]')).toContainText("Carta diferida");
    await expect.poll(() => thumb.getAttribute("src"), { timeout: 30_000 }).not.toBe(before);
    // La selección de varias sigue funcionando.
    await admin.getByRole("button", { name: "Seleccionar todas" }).click();
    await expect(admin.locator('[data-card-tile] input[type="checkbox"]:checked')).toHaveCount(3);
  });

  await test.step("Seguridad: la biblioteca del editor solo para administradores", async () => {
    const fan = await login(browser, `fan-cd-${tag}`, false, "/packs");
    expect((await fan.request.get("/api/admin/library")).status()).toBe(404);
    expect((await admin.request.get("/api/admin/library")).status()).toBe(200);
    await fan.context().close();
  });
});
