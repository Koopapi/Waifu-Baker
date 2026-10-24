// Criterios de la spec 019 («Abrir todos» dinámico): ráfaga de sobres, foco en las destacadas, «Saltar», resumen
// agrupado por rareza y movimiento reducido.
import type { Page } from "@playwright/test";
import path from "node:path";
import { desktopOnly, expect, test } from "./fixtures";
import { LAB, createPublishedSet, giftPacks, login } from "./helpers";

/** Registra los sonidos (eventos `wb:sound`) con su momento. */
async function record(page: Page) {
  await page.context().addInitScript(() => {
    const log: { name: string; at: number }[] = [];
    (window as unknown as { __wb: typeof log }).__wb = log;
    window.addEventListener("wb:sound", (e) => log.push({ name: String((e as CustomEvent).detail), at: performance.now() }));
  });
}
const sounds = (page: Page) => page.evaluate(() => (window as unknown as { __wb: { name: string; at: number }[] }).__wb);

const tagOf = (name: string) => name.replace(/[^a-z0-9]/g, "").slice(0, 6).toUpperCase();

test("abrir todos: ráfaga, foco en las destacadas y resumen", async ({ browser }) => {
  const project = test.info().project.name;
  const reduced = project === "reduced-motion";
  const tag = tagOf(project);
  const admin = await login(browser, `admin-oa-${tag}`, true);
  // 3 cartas y la 003 rara: cada sobre trae 2, con la rara garantizada.
  const setId = await createPublishedSet(admin, `OA${tag.slice(0, 4)}`, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await giftPacks(admin, `fan-oa-${tag}`, `OA${tag.slice(0, 4)}`, 3);
  const fan = await login(browser, `fan-oa-${tag}`, false, "/sobres");
  await record(fan);
  await fan.goto(`/sobres/${setId}/todos`);
  await fan.waitForLoadState("networkidle");
  // El sonido se activa con el primer gesto (el clic de «Abrir todos»).
  await fan.click('[data-testid="open-all"]');

  if (reduced) {
    await test.step("RF-14: con movimiento reducido, sin ráfaga y el foco con la imagen fija", async () => {
      await expect(fan.locator('[data-testid="open-all-focus"]')).toBeVisible();
      await expect(fan.locator('[data-testid="open-all-burst"]')).toHaveCount(0);
      await expect(fan.locator('[data-testid="focus-card"] img')).toBeVisible();
      await expect(fan.locator('[data-testid="focus-card"] .cc-card')).toHaveCount(0);
    });
  } else {
    await test.step("RF-1 a RF-3: los sobres se rasgan en ráfaga con su sonido y no pasa de 6 s", async () => {
      await expect(fan.locator('[data-testid="open-all-burst"]')).toBeVisible();
      await expect(fan.locator('[data-testid="burst-counter"]')).toContainText("de 3");
      const t0 = Date.now();
      await expect(fan.locator('[data-testid="open-all-focus"]')).toBeVisible({ timeout: 10_000 });
      expect(Date.now() - t0).toBeLessThan(6500);
      const tears = (await sounds(fan)).filter((s) => s.name === "tear");
      expect(tears.length).toBeGreaterThan(0);
      for (let i = 1; i < tears.length; i++) expect(tears[i].at - tears[i - 1].at).toBeGreaterThanOrEqual(110);
    });

    await test.step("RF-4 y RF-6: la rara nueva se presenta en grande, viva y con su sonido", async () => {
      await expect(fan.locator('[data-testid="focus-counter"]')).toHaveText("Destacada 1 de 1");
      await expect(fan.locator('[data-testid="focus-card"] .cc-card')).toBeVisible();
      await expect(fan.locator(".oa-focus__ribbon")).toContainText("¡Nueva!");
      await expect.poll(async () => (await sounds(fan)).some((s) => s.name === "rare")).toBe(true);
    });
  }

  await test.step("RF-7 y RF-10 a RF-13: al pasar la última, el resumen agrupado con copias, nuevas y totales", async () => {
    await expect(fan.locator('[data-testid="focus-next"]')).toHaveText("Ver resumen");
    await fan.locator('[data-testid="focus-next"]').click();
    const result = fan.locator('[data-testid="open-all-result"]');
    await expect(result.locator("h2")).toHaveText("Abriste 3 sobres");
    await expect(fan.locator('[data-testid="open-all-totals"] dd').first()).toHaveText("6");
    const rares = fan.locator('[data-testid="open-all-group-rare"]');
    await expect(rares.locator("h3")).toContainText("Raras · 3");
    await expect(rares.locator('[data-testid="open-all-version"]')).toHaveCount(1);
    await expect(rares.locator('[data-testid="copies"]')).toHaveText("×3");
    await expect(rares.locator(".oa-card__new")).toHaveText("¡Nueva!");
    await expect(fan.locator('[data-testid="open-all-group-common"] h3')).toContainText("Comunes · 3");
    await fan.screenshot({ path: `test-results/screens/${project}-abrir-todos-resumen.png`, fullPage: true });
  });
});

test("abrir todos: «Saltar», lote sin destacadas y 50 sobres", async ({ browser }) => {
  desktopOnly();
  const admin = await login(browser, "admin-oa-saltar", true);
  const setId = await createPublishedSet(admin, "OASK", ["04.webp", "05.webp", "06.webp"].map((f) => path.join(LAB, f)), 3);
  const fan = await login(browser, "fan-oa-saltar", false, "/sobres");

  await test.step("RF-9: «Saltar» en la ráfaga lleva directo al resumen", async () => {
    await giftPacks(admin, "fan-oa-saltar", "OASK", 2);
    await fan.goto(`/sobres/${setId}/todos`);
    await fan.click('[data-testid="open-all"]');
    await fan.locator('[data-testid="open-all-burst"] [data-testid="open-all-skip"]').click();
    await expect(fan.locator('[data-testid="open-all-result"]')).toBeVisible();
    await expect(fan.locator('[data-testid="open-all-focus"]')).toHaveCount(0);
  });

  await test.step("RF-8: un lote sin destacadas pasa de la ráfaga al resumen", async () => {
    // La rara ya no es nueva: no hay destacadas.
    await giftPacks(admin, "fan-oa-saltar", "OASK", 2);
    await fan.goto(`/sobres/${setId}/todos`);
    await fan.click('[data-testid="open-all"]');
    await expect(fan.locator('[data-testid="open-all-result"]')).toBeVisible({ timeout: 10_000 });
    await expect(fan.locator('[data-testid="open-all-focus"]')).toHaveCount(0);
  });

  await test.step("RF-2: con 50 sobres, la ráfaga se acelera y no pasa de 6 s", async () => {
    for (const n of [20, 20, 10]) await giftPacks(admin, "fan-oa-saltar", "OASK", n);
    await fan.goto(`/sobres/${setId}/todos`);
    await fan.click('[data-testid="open-all"]');
    await expect(fan.locator('[data-testid="burst-counter"]')).toContainText("de 50", { timeout: 30_000 });
    const t0 = Date.now();
    await expect(fan.locator('[data-testid="open-all-result"]')).toBeVisible({ timeout: 15_000 });
    expect(Date.now() - t0).toBeLessThan(6500);
    await expect(fan.locator('[data-testid="open-all-totals"] dd').first()).toHaveText("100");
  });
});
