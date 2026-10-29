// Criterios de finalización de la spec 013: abrir un sobre → suenan rasgado, volteos y el nivel de las raras, y
// vibran las raras → silenciar → al recargar sigue silenciado y no suena ni vibra nada → «Abrir todos» (con el
// silencio también recordado allí) suena una sola vez, con la mejor carta.
import type { Page } from "@playwright/test";
import path from "node:path";
import { revealSound, vibrationPattern } from "../src/domain/opening/feedback";
import type { Rarity } from "../src/domain/catalog/card-rules";
import { expect, test } from "./fixtures";
import { createPublishedSet, giftPacks, LAB, login, openAllAndSkip, openDeck, tear } from "./helpers";

type Log = { sounds: string[]; vibes: string[] };

/** Registra los sonidos y vibraciones de cada página (eventos `wb:sound` y un `navigator.vibrate` simulado). */
async function record(page: Page) {
  await page.context().addInitScript(() => {
    const log = { sounds: [] as string[], vibes: [] as string[] };
    (window as unknown as { __wb: typeof log }).__wb = log;
    window.addEventListener("wb:sound", (e) => log.sounds.push(String((e as CustomEvent).detail)));
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: (p: number[]) => (log.vibes.push(p.join(",")), true) });
  });
}
const log = (page: Page) => page.evaluate(() => (window as unknown as { __wb: Log }).__wb);

async function revealAll(page: Page) {
  // Spec 023: el mazo se revela y se aparte carta a carta hasta el resumen.
  await openDeck(page);
  return (await page.locator(".summary__row").evaluateAll((rows) => rows.map((r) => r.className.match(/rarity-(\w+)/)![1]))) as Rarity[];
}

test("sonido y vibración de la apertura, con silencio recordado", async ({ browser }) => {
  const admin = await login(browser, "admin-sound", true);
  // 3 cartas y la 003 rara: cada sobre trae 2, con la rara garantizada.
  await createPublishedSet(admin, "SND1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await giftPacks(admin, "fan-sound", "SND1", 5);
  const fan = await login(browser, "fan-sound", false, "/sobres");
  await record(fan);
  await fan.goto("/sobres");
  const href = (await fan.locator('[data-testid="group-SND1"] >> text=Abrir un sobre').getAttribute("href"))!;

  await test.step("RF-2, RF-3, RF-4 y RF-9: rasgado, un volteo por carta, el nivel de las raras y su vibración", async () => {
    await fan.goto(href);
    const toggle = fan.locator('[data-testid="sound-toggle"]');
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await tear(fan);
    const rarities = await revealAll(fan);
    const expected = ["tear", ...rarities.flatMap((r) => ["flip", ...(revealSound(r) ? [revealSound(r)!] : [])])];
    await expect.poll(async () => (await log(fan)).sounds).toEqual(expected);
    expect(rarities.some((r) => revealSound(r))).toBe(true);
    expect((await log(fan)).vibes).toEqual(rarities.flatMap((r) => (vibrationPattern(r) ? [vibrationPattern(r)!.join(",")] : [])));
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}/s013-1-resumen-con-sonido.png` });
  });

  await test.step("RF-7, RF-8 y RF-10: silenciar se recuerda y no suena ni vibra nada", async () => {
    const toggle = fan.locator('[data-testid="sound-toggle"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await fan.goto(href);
    await fan.waitForLoadState("networkidle");
    await expect(fan.locator('[data-testid="sound-toggle"]')).toHaveAttribute("aria-pressed", "true");
    await tear(fan);
    await revealAll(fan);
    await fan.waitForTimeout(500);
    expect(await log(fan)).toEqual({ sounds: [], vibes: [] });
  });

  // Spec 019, RF-3 (sustituye a la RF-5 de esta spec): la ráfaga suena con rasgados y el foco con la rareza de cada
  // destacada. Aquí se comprueba que el silencio corta todo eso.
  await test.step("RF-8 y RF-9: con el sonido apagado, «Abrir todos» no suena ni vibra", async () => {
    await fan.goto(`${href}/todos`);
    await fan.waitForLoadState("networkidle");
    const toggle = fan.locator('[data-testid="sound-toggle"]');
    // Viene silenciado del paso anterior (el silencio se recuerda en el dispositivo).
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(await openAllAndSkip(fan)).toBe(6);
    await fan.waitForTimeout(500);
    expect(await log(fan)).toEqual({ sounds: [], vibes: [] });
  });
});
