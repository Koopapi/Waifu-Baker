// Criterios de finalización de la spec 023: el sobre nuevo en «Mis sobres» → rasgar a medias devuelve la tira y
// rasgar del todo abre el sobre → el mazo va de menor a mayor rareza, se revela y se aparta deslizando hacia un lado →
// salir a mitad y volver retoma en el mazo sin rasgar → «Abrir todos» usa el sobre nuevo. Con movimiento reducido
// (RF-23) el ayudante `tear` abre con el botón.
import path from "node:path";
import type { Page } from "@playwright/test";
import { RARITIES } from "../src/domain/catalog/card-rules";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, dismissTop, giftPacks, login, openAllAndSkip, revealTop, tear } from "./helpers";

const es = dictionaries.es;

/** Arrastra por los dientes `dx` píxeles con el ratón y suelta (escritorio). */
async function dragStrip(page: Page, dx: number) {
  const box = (await page.locator(".tear__hit").boundingBox())!;
  const x = box.x + (dx > 0 ? 16 : box.width - 16);
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + (dx * i) / 12, y);
  await page.mouse.up();
}

test("apertura nueva: el sobre se rasga de verdad y las cartas salen en mazo", async ({ browser }) => {
  const project = test.info().project.name;
  const desktop = project === "chromium-desktop";
  const tag = project.replace(/[^a-z0-9]/g, "");
  const code = `AN${tag.slice(0, 4).toUpperCase()}`;
  const fanName = `fan-an-${tag}`;
  const fan = await login(browser, fanName, false, "/packs");
  const admin = await login(browser, `admin-an-${tag}`, true);
  // 001 y 002 comunes, 003 rara (la 004 legendaria solo sale en los gold); sobres plata de 2: una común y la rara.
  await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await giftPacks(admin, fanName, code, 3);
  await fan.goto("/packs");
  await dismissCelebration(fan);

  await test.step("RF-1 a RF-3 y RF-5: «Mis sobres» muestra el sobre nuevo con su etiqueta", async () => {
    const shell = fan.locator(`[data-testid="group-${code}"] .pack-shell[data-kind="silver"]`);
    await expect(shell).toBeVisible();
    await expect(shell.locator(".pack-shell__tag")).toHaveText(es.common.packKind.silver);
    await expect(shell.locator(".pack-shell__teeth")).toHaveCount(1);
  });

  await test.step("RF-7 y RF-8: rasgar a medias devuelve la tira; del todo, abre el sobre", async () => {
    await fan.click(`[data-testid="group-${code}"] >> text=${es.packs.mine.openOne}`);
    await fan.waitForSelector(".tear__hit");
    await fan.waitForLoadState("networkidle");
    await expect(fan.locator('[data-testid="open-without-swipe"]')).toBeVisible();
    if (desktop) {
      const w = (await fan.locator(".tear").boundingBox())!.width;
      // RF-7: menos del 60 % (y de derecha a izquierda): la tira vuelve y el sobre sigue cerrado.
      await dragStrip(fan, -w * 0.4);
      await expect(fan.locator(".tear--whole")).toBeVisible();
      await expect(fan.locator('.stage[data-phase="idle"]')).toBeVisible();
      // RF-8: más del 60 %: se arranca y salen las cartas.
      await dragStrip(fan, w * 0.75);
    } else {
      await tear(fan);
    }
    await expect(fan.locator('.stage[data-phase="deck"]')).toBeVisible();
  });

  await test.step("RF-12, RF-13, RF-15 y RF-16: el mazo va de menor a mayor rareza y se aparta deslizando", async () => {
    await revealTop(fan);
    const first = await fan.locator('[data-testid="reveal-info"]').getAttribute("class");
    if (desktop) {
      // RF-16: deslizar hacia la izquierda la aparta.
      const c = (await fan.locator('.card3d[role="button"]').boundingBox())!;
      await fan.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
      await fan.mouse.down();
      for (let i = 1; i <= 8; i++) await fan.mouse.move(c.x + c.width / 2 - i * 20, c.y + c.height / 2);
      await fan.mouse.up();
      await expect(fan.locator('[data-testid="reveal-info"]')).toHaveCount(0);
    } else {
      await dismissTop(fan);
    }
    await revealTop(fan);
    const second = await fan.locator('[data-testid="reveal-info"]').getAttribute("class");
    const rank = (cls: string | null) => RARITIES.findIndex((r) => cls?.includes(`rarity-${r}`));
    expect(rank(first)).toBeLessThanOrEqual(rank(second));
    await dismissTop(fan);
    await expect(fan.locator(".summary")).toBeVisible();
    const rows = await fan.locator(".summary__row").evaluateAll((els) => els.map((e) => e.className.match(/rarity-(\w+)/)![1]));
    expect(rows.map((r) => RARITIES.indexOf(r as never))).toEqual([...rows.map((r) => RARITIES.indexOf(r as never))].sort((a, b) => a - b));
  });

  await test.step("RF-22: salir a mitad y volver retoma en el mazo sin rasgar", async () => {
    await fan.click('[data-testid="open-another"]');
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="deck"]')).toBeVisible();
    await fan.goto("/packs");
    await fan.click('[data-testid="pending-opening"]');
    await fan.waitForURL(/\?pack=/);
    await expect(fan.locator('.stage[data-phase="deck"]')).toBeVisible();
    await expect(fan.locator(".tear__hit")).toBeHidden();
  });

  await test.step("RF-20: «Abrir todos» usa el sobre nuevo", async () => {
    await giftPacks(admin, fanName, code, 2);
    await fan.goto("/packs");
    await fan.click(`[data-testid="group-${code}"] >> text=${es.packs.mine.openAll(2)}`);
    await expect(fan.locator(".pack-shell").first()).toBeVisible();
    expect(await openAllAndSkip(fan)).toBe(4);
  });

});
