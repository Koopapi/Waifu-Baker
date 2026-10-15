// Criterios de finalización de la spec 006: abrir un sobre → ver la colección con huecos y filtros
// → ficha con holo → activar el álbum público → visitarlo sin sesión → vista previa, desactivar y
// enlace nuevo.
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { LAB, createPublishedSet, giftPacks, login } from "./helpers";

const shot = (p: Page, name: string, fullPage = false) => p.screenshot({ path: `test-results/screens/s006-${name}.png`, fullPage });

test("colección y álbum público", async ({ browser }) => {
  const fan = await login(browser, "album-e2e", false, "/sobres");
  const admin = await login(browser, "admin-e2e-3", true);
  // 3 cartas: 001 y 002 comunes, 003 rara y siempre holo. Un sobre de 2 → una común queda sin conseguir.
  await createPublishedSet(admin, "ALB1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3, 100);
  await giftPacks(admin, "album-e2e", "ALB1", 1);
  await fan.goto("/sobres");
  const href = await fan.locator('[data-testid="group-ALB1"] >> text=Abrir un sobre').getAttribute("href");
  await fan.goto(`${href}/todos`);
  await fan.click('[data-testid="open-all"]');
  await expect(fan.locator('[data-testid="open-all-grid"] li')).toHaveCount(2);

  await test.step("RF-1: «Mi colección» lista la colección con su progreso", async () => {
    await fan.click("header >> text=Mi colección");
    await expect(fan).toHaveURL(/\/coleccion$/);
    await expect(fan.locator('[data-testid="collection-ALB1"] [data-testid="progress"]')).toHaveText("2/3");
    await shot(fan, "1-mi-coleccion");
  });

  await test.step("RF-2 y RF-3: el álbum muestra las que tengo y las que faltan como silueta", async () => {
    await fan.click('[data-testid="collection-ALB1"] a');
    await expect(fan.locator('[data-testid="binder-progress"]')).toHaveText("2 de 3 cartas");
    const grid = fan.locator('[data-testid="binder-grid"]');
    await expect(grid.locator("li")).toHaveCount(3);
    const missing = grid.locator('li[data-missing="true"]');
    await expect(missing).toHaveCount(1);
    await expect(missing.locator("img")).toHaveCount(0);
    await expect(missing).not.toContainText("ALB1 carta");
    const img = grid.locator('[data-slot="3"] img');
    await expect(img).toHaveAttribute("src", /^\/api\/cards\/img\?c=.+&s=thumb&/);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(300);
    await shot(fan, "2-album-coleccion");
  });

  await test.step("RF-7: filtros por estado y por rareza", async () => {
    const items = fan.locator('[data-testid="binder-grid"] li');
    await fan.click("text=Me faltan");
    await expect(items).toHaveCount(1);
    await fan.click("text=Las que tengo");
    await expect(items).toHaveCount(2);
    await fan.click('[data-testid="binder-filters"] >> text=Holo');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toHaveAttribute("data-slot", "3");
    await fan.click('[data-testid="binder-filters"] >> text=Todas');
    await fan.selectOption('[aria-label="Filtrar por rareza"]', "common");
    await expect(items).toHaveCount(1);
    await fan.selectOption('[aria-label="Filtrar por rareza"]', "");
    await expect(items).toHaveCount(3);
  });

  await test.step("RF-5 y RF-6: ficha de la carta con holo y cambio de versión", async () => {
    await expect(fan.locator('[data-slot="3"]')).toContainText("HOLO");
    await fan.click('[aria-label="Ver carta 003"]');
    const sheet = fan.locator('[data-testid="card-sheet"]');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("h2")).toHaveText("ALB1 carta 003");
    await expect(sheet).toContainText("Rara");
    await expect(sheet).toContainText("La conseguiste por primera vez");
    await expect(sheet.locator("dd").nth(1)).toHaveText("x1");
    await expect(sheet.locator('[data-testid="card-sheet-art"] .card3d--holo')).toHaveCount(1);
    await expect.poll(() => sheet.locator(".card3d img").evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(750);
    await fan.waitForTimeout(500);
    await shot(fan, "3-ficha-holo");
    await sheet.locator("button:text-is('Normal')").click();
    await expect(sheet.locator('[data-testid="card-sheet-art"] .card3d--holo')).toHaveCount(0);
    await fan.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });

  let url = "";
  await test.step("RF-8 y RF-9: el álbum empieza privado y se activa con un alias", async () => {
    await fan.goto("/coleccion/album");
    await expect(fan.locator('[data-testid="album-status"] h2')).toHaveText("Tu álbum es privado");
    await fan.fill('input[name="alias"]', "x");
    await fan.click("text=Activar álbum público");
    await expect(fan.locator('input[name="alias"]')).toHaveJSProperty("validity.valid", false);
    await fan.fill('input[name="alias"]', "Coleccionista E2E");
    await fan.click("text=Activar álbum público");
    await expect(fan.locator("text=Álbum público activado.")).toBeVisible();
    await expect(fan.locator('[data-testid="album-status"] h2')).toHaveText("Tu álbum es público");
    url = await fan.locator('[data-testid="album-url"]').inputValue();
    expect(url).toMatch(/\/album\/[0-9A-Za-z]{12}$/);
  });

  await test.step("RF-12: elegir destacadas en orden", async () => {
    await fan.click('[aria-label="Destacar ALB1 003"]');
    const other = fan.locator('[data-testid="featured-picker"] button[aria-pressed="false"][aria-label^="Destacar"]').first();
    await other.click();
    await expect(fan.locator('[data-testid="featured-order"] li')).toHaveCount(2);
    await expect(fan.locator('[data-testid="featured-order"] li').first()).toContainText("1. ALB1 carta 003");
    await fan.click("text=Guardar destacadas");
    await expect(fan.locator("text=Destacadas guardadas.")).toBeVisible();
    await shot(fan, "4-ajustes-album", true);
  });

  const anon = await (await browser.newContext()).newPage();
  await test.step("RF-13: un visitante sin sesión ve alias, destacadas y la colección", async () => {
    await anon.goto(url);
    await expect(anon.locator('[data-testid="album-alias"]')).toHaveText("Coleccionista E2E");
    await expect(anon.locator('[data-testid="album-totals"]')).toContainText("2 de 3 cartas");
    await expect(anon.locator('[data-testid="album-featured"] li')).toHaveCount(2);
    await expect(anon.locator('[data-testid="album-featured"] li').first()).toContainText("ALB1 carta 003");
    const col = anon.locator('[data-testid="album-collection-ALB1"]');
    await expect(col.locator('li[data-missing="true"]')).toHaveCount(1);
    await expect(col.locator("li img")).toHaveCount(2);
  });

  await test.step("RF-14: no aparece el nombre de la cuenta", async () => {
    expect(await anon.content()).not.toContain("album-e2e");
  });

  await test.step("RF-15: solo imágenes reducidas con marca de agua", async () => {
    const img = anon.locator('[data-testid="album-featured"] img').first();
    await expect(img).toHaveAttribute("src", /^\/api\/album\/[0-9A-Za-z]{12}\/img\?c=[0-9a-f-]{36}$/);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(600);
    const full = await anon.request.get(`/api/cards/img?c=x&s=full&e=${Date.now() + 60000}&sig=00`);
    expect(full.status()).toBe(404);
    await anon.waitForTimeout(500);
    await shot(anon, "5-album-publico", true);
  });

  await test.step("RF-16: imagen de vista previa para redes", async () => {
    const og = await anon.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toContain("/opengraph-image");
    const res = await anon.request.get(og!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const prev = await anon.context().newPage();
    await prev.goto(og!);
    await prev.screenshot({ path: "test-results/screens/s006-6-vista-previa.png" });
    await prev.close();
  });

  await test.step("RF-17: el álbum pide no ser indexado", async () => {
    await expect(anon.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  await test.step("RF-13: el álbum público cabe en un móvil sin desplazamiento lateral", async () => {
    await anon.setViewportSize({ width: 390, height: 844 });
    await anon.reload();
    expect(await anon.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await shot(anon, "7-album-movil", true);
    await fan.setViewportSize({ width: 390, height: 844 });
    await fan.goto(`${new URL(fan.url()).origin}/coleccion`);
    await fan.click('[data-testid="collection-ALB1"] a');
    await fan.waitForURL(/\/coleccion\/[0-9a-f-]{36}$/);
    await expect(fan.locator('[data-testid="binder-grid"] li')).toHaveCount(3);
    await expect
      .poll(() => fan.locator('[data-testid="binder-grid"] img').evaluateAll((els) => els.map((e) => [(e as HTMLImageElement).naturalWidth, e.getBoundingClientRect().height])))
      .toEqual([
        [300, expect.any(Number)],
        [300, expect.any(Number)],
      ]);
    expect(await fan.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await shot(fan, "8-coleccion-movil", true);
    await fan.setViewportSize({ width: 1360, height: 950 });
    await fan.goto("/coleccion/album");
  });

  await test.step("RF-10: desactivar lo oculta y reactivar recupera el mismo enlace", async () => {
    await fan.click("text=Desactivar álbum");
    await expect(fan.locator('[data-testid="album-status"] h2')).toHaveText("Tu álbum es privado");
    expect((await anon.goto(url))?.status()).toBe(404);
    await fan.click("text=Activar álbum público");
    await expect(fan.locator('[data-testid="album-url"]')).toHaveValue(url);
    expect((await anon.goto(url))?.status()).toBe(200);
  });

  await test.step("RF-11: un enlace nuevo invalida el anterior", async () => {
    await fan.click("text=Generar enlace nuevo");
    await expect(fan.locator("text=Enlace nuevo creado. El anterior ya no funciona.")).toBeVisible();
    await expect(fan.locator('[data-testid="album-url"]')).not.toHaveValue(url);
    const next = await fan.locator('[data-testid="album-url"]').inputValue();
    expect(next).toMatch(/\/album\/[0-9A-Za-z]{12}$/);
    expect((await anon.goto(url))?.status()).toBe(404);
    expect((await anon.goto(next))?.status()).toBe(200);
  });
});
