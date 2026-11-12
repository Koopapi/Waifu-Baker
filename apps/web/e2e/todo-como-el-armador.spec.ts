// Criterios de finalización de la spec 037: los sobres regalados llegan con la miniatura del armador (plata o gold) →
// la carta revelada y el resumen no llevan letrero de rareza (la rareza queda para los lectores de pantalla) → las
// copias holo se ven con su imagen fija holo en el resumen, en la colección y en el álbum → ningún sobre plano anterior
// → los ajustes del sobre del panel muestran el plata y el gold → una carta sin capas (laboratorio) conserva su insignia.
import path from "node:path";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login, openDeck, revealTop, tear } from "./helpers";

const es = dictionaries.es;

test("el sobre y la carta del armador en todas las vistas", async ({ browser }) => {
  test.setTimeout(420_000);
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const code = `AR${tag.slice(0, 4).toUpperCase()}`;
  const fanName = `fan-ar-${tag}`;
  const admin = await login(browser, `admin-ar-${tag}`, true);
  // Todas las copias salen holo (100 %): así cada carta del sobre trae su imagen fija holo.
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3, 100);
  await giftPacks(admin, fanName, code, 1, "gold");
  await giftPacks(admin, fanName, code, 1);
  const fan = await login(browser, fanName, false, "/packs", { keepCelebration: true });

  await test.step("RF-2 y RF-5: la llegada muestra la miniatura del sobre que llegó, del tipo que llegó", async () => {
    const dialog = fan.locator('[data-testid="celebration-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-testid="prize-pack"][data-kind="gold"]')).toBeVisible();
    await dismissCelebration(fan, 10_000);
  });

  await test.step("RF-6: ningún sobre plano anterior en «Mis sobres» ni en las recompensas", async () => {
    await expect(fan.locator('[data-testid="pack-thumb"]').first()).toBeVisible();
    await expect(fan.locator(".pack-art")).toHaveCount(0);
    await fan.goto("/rewards");
    await expect(fan.locator('[data-testid="rewards"]')).toBeVisible();
    await expect(fan.locator(".pack-art")).toHaveCount(0);
  });

  await test.step("RF-21, RF-22 y RF-24: la carta revelada sin letrero de rareza, con su nombre y la rareza para lectores", async () => {
    await fan.goto(`/packs/${setId}`);
    await tear(fan);
    await revealTop(fan);
    const info = fan.locator('[data-testid="reveal-info"]');
    await expect(info.locator('[data-testid="reveal-badge"]')).toHaveCount(0);
    await expect(info.locator(".reveal-info__mini")).toHaveCount(0);
    await expect(info.locator('[data-testid="reveal-rarity"]')).toHaveText(es.common.rarity.common);
    await expect(info.locator(".reveal-info__name")).toContainText(`${code} carta`);
    await expect(info).toContainText(es.packs.stage.holoSuffix.toUpperCase().trim());
  });

  await test.step("RF-23 y RF-14: el resumen sin letrero de rareza y con la imagen fija holo", async () => {
    await fan.locator('.card3d[role="button"]').first().click();
    await openDeck(fan);
    await expect(fan.locator('[data-testid="summary-badge"]')).toHaveCount(0);
    const img = fan.locator(".summary__thumb img").first();
    await expect(img).toHaveAttribute("src", /&s=mid-holo&/);
    await expect(fan.locator(".summary__thumb.holo-finish")).toHaveCount(0);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(700);
  });

  await test.step("RF-7 y RF-12: en la colección, las copias holo con su imagen fija holo", async () => {
    await fan.goto(`/collection/${setId}`);
    const thumb = fan.locator('[data-testid="binder-grid"] img').first();
    await expect(thumb).toHaveAttribute("src", /&s=thumb-holo&/);
    await expect.poll(() => thumb.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(300);
    await expect(fan.locator(".binder-card.holo-finish")).toHaveCount(0);
  });

  await test.step("RF-8 y RF-12: en el álbum, las copias holo con su imagen fija holo", async () => {
    await fan.goto("/collection/album");
    await expect(fan.locator('img[src*="&s=thumb-holo&"]').first()).toBeVisible();
  });

  await test.step("RF-4: los ajustes del sobre del panel muestran el sobre plata y el gold", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    const settings = admin.locator('[data-testid="pack-settings"]');
    await expect(settings.locator('[data-testid="prize-pack"][data-kind="silver"]')).toBeVisible();
    await expect(settings.locator('[data-testid="prize-pack"][data-kind="gold"]')).toBeVisible();
    await expect(admin.locator(".pack-art")).toHaveCount(0);
  });

  await test.step("RF-25: una carta sin capas (laboratorio) conserva su insignia de rareza", async () => {
    await fan.goto("/lab");
    await tear(fan);
    await revealTop(fan);
    await expect(fan.locator('[data-testid="reveal-badge"]')).toBeVisible();
  });
});
