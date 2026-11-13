// Criterios de finalización de la spec 040. Safari de iPhone deja de pintar las capas de debajo de una capa con mezcla
// si el arte no es un grupo aislado. El iPhone simulado (WebKit de la Mac) no reproduce la falla: aquí se comprueba que
// el arte va aislado en cada vista (RF-1 a RF-3) y que en la computadora la carta se pinta igual que sin aislar (RF-4).
// La revisión en un iPhone real la hace el dueño (T4).
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import sharp from "sharp";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login, revealTop, tear } from "./helpers";

const LIB = path.resolve(__dirname, "../src/ui/game/carta-capas/carta-capas.js");

/** El `isolation` calculado de cada elemento del localizador. */
const isolationOf = (l: Locator) => l.evaluateAll((els) => els.map((e) => getComputedStyle(e).isolation));

/** Diferencia media por canal (0 a 255) entre dos capturas del mismo tamaño. */
async function meanDiff(a: Buffer, b: Buffer) {
  const [ra, rb] = await Promise.all([a, b].map((x) => sharp(x).raw().toBuffer({ resolveWithObject: true })));
  expect([ra.info.width, ra.info.height]).toEqual([rb.info.width, rb.info.height]);
  let sum = 0;
  for (let i = 0; i < ra.data.length; i++) sum += Math.abs(ra.data[i] - rb.data[i]);
  return sum / ra.data.length;
}

/**
 * Monta, sin el sitio, una carta como la EX que falló: fondo, chica con encuadre «contener», capa con brillo holo,
 * estrella, capa en «aclarar» y otra con brillo holo encima. Sin parallax en reposo, para que la imagen no cambie.
 */
async function mountBlendCard(page: Page) {
  await page.setContent('<div id="c" style="width:280px;margin:40px"></div>');
  await page.addScriptTag({ path: LIB });
  await page.evaluate(async () => {
    const W = 700, H = 991;
    const layer = (w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      draw(c.getContext("2d")!);
      return new Promise<string>((ok) => c.toBlob((b) => ok(URL.createObjectURL(b!)), "image/png"));
    };
    const src = await Promise.all([
      layer(W, H, (x) => { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#2a0f4a"); g.addColorStop(1, "#b3123c"); x.fillStyle = g; x.fillRect(0, 0, W, H); }),
      layer(500, 707, (x) => { x.fillStyle = "#ff6fb0"; x.beginPath(); x.arc(250, 380, 190, 0, 7); x.fill(); }),
      layer(W, H, (x) => { x.fillStyle = "#3fe0ff"; x.beginPath(); x.moveTo(0, 0); x.lineTo(210, 0); x.lineTo(0, 310); x.fill(); }),
      layer(W, H, (x) => { x.fillStyle = "#ffd23f"; x.fillRect(470, 690, 120, 120); }),
      layer(W, H, (x) => { x.fillStyle = "#1c1030"; x.fillRect(0, 0, W, H); x.strokeStyle = "#8a7cff"; x.lineWidth = 13; for (let k = -H; k < W; k += 60) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + H, H); x.stroke(); } }),
      layer(W, H, (x) => { x.fillStyle = "#7dff6a"; x.beginPath(); x.moveTo(0, H); x.lineTo(280, H); x.lineTo(0, H - 350); x.fill(); }),
    ]);
    const lib = (window as unknown as { CartaCapas: { montar: (el: Element, op: object) => { listo: Promise<void> } } }).CartaCapas;
    const card = lib.montar(document.getElementById("c")!, {
      marco: "ex",
      reposo: false,
      capas: [
        { src: src[0], margen: 5, profundidad: 0.2 },
        { src: src[1], margen: 4, encuadre: { ajuste: "contener" }, profundidad: 0.75 },
        { src: src[2], brillo: { tipo: "holo", intensidad: 0.55 }, profundidad: 0 },
        { src: src[3], margen: 3, profundidad: 0.7 },
        { src: src[4], margen: 5, mezcla: "lighten", profundidad: 1.05 },
        { src: src[5], brillo: { tipo: "holo", intensidad: 0.54 }, profundidad: 0 },
      ],
    });
    await card.listo;
  });
  const art = page.locator(".cc-art");
  await expect(page.locator(".cc-card")).not.toHaveClass(/cc-cargando/);
  // La entrada (transición de opacidad) termina antes de comparar.
  await page.waitForTimeout(800);
  return art;
}

test("RF-4: en la computadora, la carta con una capa con mezcla se pinta igual con el arte aislado", async ({ page }) => {
  const art = await mountBlendCard(page);
  expect(await isolationOf(art)).toEqual(["isolate"]);
  const isolated = await art.screenshot({ animations: "disabled" });
  await page.addStyleTag({ content: ".cc-art{isolation:auto!important}" });
  expect(await isolationOf(art)).toEqual(["auto"]);
  const before = await art.screenshot({ animations: "disabled" });
  expect(await meanDiff(isolated, before)).toBeLessThan(1);
});

test("el arte de la carta y del sobre va aislado en cada vista", async ({ browser }) => {
  test.skip(test.info().project.name === "reduced-motion", "con movimiento reducido no se monta la carta viva");
  test.setTimeout(300_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const stamp = Date.now().toString(36).slice(-4).toUpperCase();
  const code = `MZ${tag.slice(0, 2).toUpperCase()}${stamp}`;
  const fanName = `fan-mz-${tag}-${stamp}`;
  const fan2Name = `fan-mz2-${tag}-${stamp}`;
  const admin = await login(browser, `admin-mz-${tag}`, true);
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);

  await test.step("RF-1, RF-3 y RF-5: en el armador, con una carta ya guardada antes del cambio", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await admin.click('[aria-label="Editar carta 001"]');
    const art = admin.locator('[data-testid="layers-preview"] .cc-art');
    await expect(art).toBeVisible();
    expect(await isolationOf(art)).toEqual(["isolate"]);
    await admin.click('[data-testid="card-cancel"]');
  });

  await test.step("RF-1 y RF-3: en el simulador", async () => {
    await admin.goto(`/admin/sets/${setId}/simulate`);
    await tear(admin);
    await revealTop(admin);
    const art = admin.locator(".card3d:visible .card3d__live .cc-art");
    await expect(art).toBeVisible();
    expect(await isolationOf(art)).toEqual(["isolate"]);
  });

  await test.step("RF-1, RF-2 y RF-3: en la apertura del coleccionista, el sobre y la carta", async () => {
    await giftPacks(admin, fanName, code, 1);
    const fan = await login(browser, fanName, false, "/packs");
    await fan.goto(`/packs/${setId}`);
    await dismissCelebration(fan);
    // RF-2: las capas del sobre, antes de rasgarlo.
    const pila = fan.locator('[data-testid="tear-pack"] .sc-pila');
    await expect(pila.first()).toBeAttached();
    expect(new Set(await isolationOf(pila))).toEqual(new Set(["isolate"]));
    await tear(fan);
    await revealTop(fan);
    const art = fan.locator(".card3d:visible .card3d__live .cc-art");
    await expect(art).toBeVisible();
    expect(await isolationOf(art)).toEqual(["isolate"]);

    await test.step("RF-1 y RF-3: en la ficha de la carta", async () => {
      await fan.goto(`/collection/${setId}`);
      await fan.click('[aria-label="Ver carta 001"]');
      const sheet = fan.locator('[data-testid="card-sheet-art"] .cc-art');
      await expect(sheet).toBeVisible();
      expect(await isolationOf(sheet)).toEqual(["isolate"]);
    });
    await fan.context().close();
  });

  await test.step("RF-1 y RF-3: en «Abrir todos»", async () => {
    await giftPacks(admin, fan2Name, code, 1);
    const fan2 = await login(browser, fan2Name, false, "/packs");
    await fan2.goto(`/packs/${setId}/all`);
    await fan2.waitForLoadState("networkidle");
    await fan2.click('[data-testid="open-all"]');
    const art = fan2.locator('[data-testid="focus-card"] .cc-art');
    await expect(art).toBeVisible({ timeout: 15_000 });
    expect(await isolationOf(art)).toEqual(["isolate"]);
    await fan2.context().close();
  });

  await test.step("RF-1 y RF-3: en el diseñador de sobres", async () => {
    await admin.goto(`/admin/sets/${setId}/pack/silver`);
    await admin.click('[data-testid="pack-test"]');
    await expect(admin.locator('[data-testid="pack-test-next"]')).toBeVisible({ timeout: 10_000 });
    const art = admin.locator('[data-testid="pack-preview"] .pack-designer__card .cc-art').first();
    await expect(art).toBeVisible();
    expect(await isolationOf(art)).toEqual(["isolate"]);
  });

  await admin.context().close();
});
