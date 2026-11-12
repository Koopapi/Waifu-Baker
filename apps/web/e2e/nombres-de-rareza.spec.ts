// Criterios de finalización de la spec 038: las probabilidades públicas, el resumen de un sobre y el filtro de la
// colección nombran las rarezas Common, Rare, Ultra Rare, SSR y EX, sin los nombres anteriores, y la carta lleva su
// sello nuevo.
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, dismissCelebration, giftPacks, login, openDeck, tear } from "./helpers";

const OLD = /\b(Común|Rara|Épica|Legendaria|Epic|Legendary)\b/;

test("nombres nuevos de las rarezas", async ({ browser }) => {
  test.setTimeout(300_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const code = `RN${tag.slice(0, 4).toUpperCase()}`;
  const fanName = `fan-rn-${tag}`;
  const admin = await login(browser, `admin-rn-${tag}`, true);
  // 001 y 002 Common, 003 Rare y la de los gold, SSR.
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await giftPacks(admin, fanName, code, 1, "gold");
  const fan = await login(browser, fanName, false, "/packs");

  await test.step("RF-1 y RF-3: las probabilidades públicas usan los nombres nuevos", async () => {
    await fan.goto("/drop-rates");
    const main = fan.locator("main");
    await expect(main).toContainText("Common");
    await expect(main).toContainText("SSR");
    await expect(main).toContainText("Ultra Rare");
    expect(await main.innerText()).not.toMatch(OLD);
  });

  await test.step("RF-3 y RF-5: el resumen de un sobre gold nombra la SSR y la estrella dice SSR", async () => {
    await fan.goto(`/packs/${setId}?k=gold`);
    await dismissCelebration(fan);
    await tear(fan);
    await openDeck(fan);
    await expect(fan.locator(".summary")).toContainText("SSR");
    expect(await fan.locator(".summary").innerText()).not.toMatch(OLD);
  });

  await test.step("RF-6: la carta SSR lleva el sello SSR", async () => {
    await fan.goto(`/collection/${setId}`);
    // Con movimiento reducido la ficha muestra la imagen fija (el sello va dibujado dentro).
    if (test.info().project.name === "reduced-motion") return;
    await fan.locator('[data-testid="binder-grid"] button').first().click();
    await expect(fan.locator('[data-testid="card-sheet-art"] .cc-sello').first()).toHaveText("SSR");
    await fan.keyboard.press("Escape");
  });

  await test.step("RF-3: el filtro de la colección ofrece los nombres nuevos", async () => {
    await choose(fan, "Filtrar por rareza", /^SSR$/);
    await expect(fan.locator('[data-testid="binder-grid"] li[data-slot]:not([data-missing])')).toHaveCount(1);
  });
});
