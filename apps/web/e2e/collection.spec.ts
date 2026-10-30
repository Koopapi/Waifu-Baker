// Criterios de finalización de la spec 006: abrir un sobre → ver la colección con huecos y filtros
// → ficha con holo → activar el álbum público → visitarlo sin sesión → vista previa, desactivar y
// enlace nuevo.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import path from "node:path";
import { LAB, choose, createPublishedSet, dismissCelebration, giftPacks, login, openAllAndSkip } from "./helpers";

const shot = (p: Page, name: string, fullPage = false) =>
  p.screenshot({ path: `test-results/screens/${test.info().project.name}/s006-${name}.png`, fullPage });

test("colección y álbum público", async ({ browser }) => {
  const fan = await login(browser, "album-e2e", false, "/packs");
  const admin = await login(browser, "admin-e2e-3", true);
  // 3 cartas: 001 y 002 comunes, 003 rara y siempre holo (y la 004, legendaria, solo en los sobres gold: spec 022).
  // Un sobre plata de 2 → una común y la legendaria quedan sin conseguir.
  await createPublishedSet(admin, "ALB1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3, 100);
  await giftPacks(admin, "album-e2e", "ALB1", 1);
  await fan.goto("/packs");
  await dismissCelebration(fan);
  const href = await fan.locator('[data-testid="group-ALB1"] >> text=Abrir un sobre').getAttribute("href");
  await fan.goto(`${href}/all`);
  expect(await openAllAndSkip(fan)).toBe(2);

  await test.step("RF-1: «Mi colección» lista la colección con su progreso", async () => {
    await fan.click("header >> text=Mi colección");
    await expect(fan).toHaveURL(/\/collection$/);
    await expect(fan.locator('[data-testid="collection-ALB1"] [data-testid="progress"]')).toHaveText("2/4");
    await shot(fan, "1-mi-coleccion");
  });

  await test.step("RF-2 y RF-3: el álbum muestra las que tengo y las que faltan como silueta", async () => {
    // En un ejecutor lento, un clic justo al terminar la navegación anterior puede perderse: se repite
    // hasta que cambia la URL (el enlace es el mismo, repetirlo no tiene efecto).
    await fan.waitForLoadState("networkidle");
    await expect(async () => {
      await fan.click('[data-testid="collection-ALB1"] a');
      await expect(fan).toHaveURL(/\/collection\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    }).toPass({ timeout: 60_000 });
    await expect(fan.locator('[data-testid="binder-progress"]')).toHaveText("2 de 4 cartas");
    const grid = fan.locator('[data-testid="binder-grid"]');
    await expect(grid.locator("li")).toHaveCount(4);
    const missing = grid.locator('li[data-missing="true"]');
    await expect(missing).toHaveCount(2);
    await expect(missing.locator("img")).toHaveCount(0);
    // Las dos siluetas (la común sin conseguir y la legendaria de los gold) no revelan su nombre.
    for (const i of [0, 1]) await expect(missing.nth(i)).not.toContainText("ALB1 carta");
    const img = grid.locator('[data-slot="3"] img');
    await expect(img).toHaveAttribute("src", /^\/api\/cards\/img\?c=.+&s=thumb&/);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(300);
    await shot(fan, "2-album-coleccion");
  });

  await test.step("RF-7: filtros por estado y por rareza", async () => {
    const items = fan.locator('[data-testid="binder-grid"] li');
    await fan.click("text=Me faltan");
    await expect(items).toHaveCount(2);
    await fan.click("text=Las que tengo");
    await expect(items).toHaveCount(2);
    await fan.click('[data-testid="binder-filters"] >> text=Holo');
    // Spec 022: el holo vale para todas las rarezas; con 100 % las dos cartas que tengo (la común y la rara) son holo.
    await expect(items).toHaveCount(2);
    await expect(fan.locator('[data-testid="binder-grid"] li[data-slot="3"]')).toHaveCount(1);
    await fan.click('[data-testid="binder-filters"] >> text=Todas');
    await choose(fan, "Filtrar por rareza", /^Común$/);
    await expect(items).toHaveCount(1);
    await choose(fan, "Filtrar por rareza", "Todas las rarezas");
    await expect(items).toHaveCount(4);
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
    // Spec 018: la holo lleva el brillo de la carta viva (o el acabado arcoíris de la imagen fija con movimiento reducido).
    const art = sheet.locator('[data-testid="card-sheet-art"]');
    const holoOn = art.locator(".cc-card.cc-con-holo, .holo-finish");
    await expect(holoOn).toHaveCount(1);
    await expect.poll(() => art.locator("img").first().evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    await fan.waitForTimeout(500);
    await shot(fan, "3-ficha-holo");
    await sheet.locator("button:text-is('Normal')").click();
    await expect(holoOn).toHaveCount(0);
    await fan.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });

  let url = "";
  await test.step("RF-8 y RF-9: el álbum empieza privado y se activa con un alias", async () => {
    await fan.goto("/collection/album");
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
    await expect(anon.locator('[data-testid="album-totals"]')).toContainText("2 de 4 cartas");
    await expect(anon.locator('[data-testid="album-featured"] li')).toHaveCount(2);
    await expect(anon.locator('[data-testid="album-featured"] li').first()).toContainText("ALB1 carta 003");
    const col = anon.locator('[data-testid="album-collection-ALB1"]');
    await expect(col.locator('li[data-missing="true"]')).toHaveCount(2);
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
    await prev.screenshot({ path: `test-results/screens/${test.info().project.name}/s006-6-vista-previa.png` });
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
    await fan.goto(`${new URL(fan.url()).origin}/collection`);
    await fan.click('[data-testid="collection-ALB1"] a');
    await fan.waitForURL(/\/collection\/[0-9a-f-]{36}$/);
    await expect(fan.locator('[data-testid="binder-grid"] li')).toHaveCount(4);
    await expect
      .poll(() => fan.locator('[data-testid="binder-grid"] img').evaluateAll((els) => els.map((e) => [(e as HTMLImageElement).naturalWidth, e.getBoundingClientRect().height])))
      .toEqual([
        [300, expect.any(Number)],
        [300, expect.any(Number)],
      ]);
    expect(await fan.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await shot(fan, "8-coleccion-movil", true);
    const own = test.info().project.use.viewport ?? { width: 1360, height: 950 };
    await fan.setViewportSize(own);
    await anon.setViewportSize(own);
    await fan.goto("/collection/album");
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
    // Spec 011, RF-12: confirmación en el modal propio.
    await fan.click('[data-testid="confirm-accept"]');
    await expect(fan.locator("text=Enlace nuevo creado. El anterior ya no funciona.")).toBeVisible();
    await expect(fan.locator('[data-testid="album-url"]')).not.toHaveValue(url);
    const next = await fan.locator('[data-testid="album-url"]').inputValue();
    expect(next).toMatch(/\/album\/[0-9A-Za-z]{12}$/);
    expect((await anon.goto(url))?.status()).toBe(404);
    expect((await anon.goto(next))?.status()).toBe(200);
  });
});
