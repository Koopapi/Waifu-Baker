// Criterios de finalización de la spec 015: entrar con llegadas (una celebración, una sola vez; «¡Nuevo!» que
// desaparece en la siguiente visita) → reclamar la diaria (estampado, vuelo, marcador, sin aviso emergente) →
// reclamar un sobre gratis (vuelo hasta la navegación) → día de gracia (latido y texto) → día 7 (celebración y vuelo
// al cerrar) → error junto al botón sin vuelo → silencio desde la cabecera → el panel conserva sus avisos → nada
// vuela ni late con movimiento reducido.
import type { APIRequestContext, Page } from "@playwright/test";
import path from "node:path";
import { DAILY_SCHEDULE } from "../src/domain/rewards/daily";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, giftPacks, login } from "./helpers";

const es = dictionaries.es;
const fx = es.rewards.fx;

type Log = { sounds: string[]; vibes: string[]; flights: string[] };

/** Registra sonidos, vibraciones y vuelos (eventos `wb:sound`, `wb:fly` y un `navigator.vibrate` simulado). */
async function record(page: Page) {
  await page.context().addInitScript(() => {
    const log = { sounds: [] as string[], vibes: [] as string[], flights: [] as string[] };
    (window as unknown as { __wb: typeof log }).__wb = log;
    window.addEventListener("wb:sound", (e) => log.sounds.push(String((e as CustomEvent).detail)));
    window.addEventListener("wb:fly", (e) => log.flights.push(String((e as CustomEvent).detail)));
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: (p: number[]) => (log.vibes.push(p.join(",")), true) });
  });
}
const log = (page: Page) => page.evaluate(() => (window as unknown as { __wb: Log }).__wb);
const advance = async (api: APIRequestContext, hours: number) => expect((await api.post("/api/dev/clock", { data: { advanceHours: hours } })).status()).toBe(200);
const reload = async (p: Page) => {
  await p.reload();
  await p.waitForLoadState("networkidle");
};
const claimDaily = (p: Page) => p.locator('[data-testid="daily-claim"]').click();
const noCelebration = async (p: Page) => {
  await p.waitForTimeout(900);
  await expect(p.locator('[data-testid="celebration-dialog"]')).toHaveCount(0);
};

test("premios con vida: llegadas, galletas y sobres que vuelan, racha y errores junto al botón", async ({ browser, request }) => {
  const reduced = test.info().project.name === "reduced-motion";
  const admin = await login(browser, "admin-premios", true);
  // 3 cartas: 001 y 002 comunes y 003 rara; cada sobre trae 2 cartas.
  const setId = await createPublishedSet(admin, "PRM1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await giftPacks(admin, "fan-premios", "PRM1", 2);
  const fan = await login(browser, "fan-premios", false, "/sobres", { keepCelebration: true });
  const dialog = fan.locator('[data-testid="celebration-dialog"]');

  await test.step("RF-6 y RF-7: al entrar con dos regalos sale una sola celebración, con su origen", async () => {
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(fx.arrivals.title(2));
    await expect(dialog.locator('[data-testid="celebration-kicker"]')).toHaveText(fx.arrivals.gift);
    await expect(dialog.locator('[data-testid="celebration-count"]')).toHaveText("×2");
    await expect(dialog.locator(".pack-art")).toBeVisible();
    await expect(fan.locator('[data-testid="toast"]')).toHaveCount(0);
    // Centrada y entera dentro de la pantalla, también en una pantalla baja (el portátil del usuario: 868 × 625).
    const centered = async () => {
      await fan.waitForTimeout(600);
      const vp = fan.viewportSize()!;
      const b = (await dialog.boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
      expect(Math.abs(b.x + b.width / 2 - vp.width / 2)).toBeLessThan(4);
      expect(Math.abs(b.y + b.height / 2 - vp.height / 2)).toBeLessThan(4);
    };
    await centered();
    if (!test.info().project.use.isMobile) {
      const size = fan.viewportSize()!;
      await fan.setViewportSize({ width: 868, height: 625 });
      await centered();
      await fan.setViewportSize(size);
    }
    await dialog.locator('[data-testid="celebration-primary"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(fan).toHaveURL(/\/sobres$/);
  });

  await test.step("RF-8: «Mis sobres» marca los dos como nuevos; en la siguiente visita ya no", async () => {
    await expect(fan.locator('[data-testid="new-packs"]')).toHaveText(fx.newPacks(2));
    await reload(fan);
    await expect(fan.locator('[data-testid="new-packs"]')).toHaveCount(0);
    await noCelebration(fan);
  });

  await test.step("RF-7: desde otro dispositivo no se vuelve a celebrar", async () => {
    const other = await login(browser, "fan-premios", false, "/sobres", { keepCelebration: true });
    await noCelebration(other);
    await other.context().close();
  });

  await record(fan);
  await fan.goto("/recompensas");
  await fan.waitForLoadState("networkidle");

  await test.step("RF-1, RF-10, RF-12 y RF-15: la diaria se estampa, las galletas vuelan al contador y suenan; sin avisos", async () => {
    await claimDaily(fan);
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(fx.sr.gotCookies(10, 10));
    if (reduced) {
      await expect(fan.locator('[data-testid="flight"]')).toHaveCount(0);
    } else {
      await expect(fan.locator('[data-testid="flight"][data-sticker="cookie"]').first()).toBeAttached();
    }
    await expect(fan.locator('[data-testid="cookie-balance"]')).toHaveText(es.rewards.cookies.balance(10));
    await expect(fan.locator('[data-testid="toast"]')).toHaveCount(0);
    await expect(fan.locator('[data-testid="daily"] [data-tone="success"]')).toHaveCount(0);
    await expect.poll(async () => (await log(fan)).sounds).toContain("cookies");
    expect((await log(fan)).flights).toContain("cookie>cookies");
    expect((await log(fan)).vibes).toEqual([]);
  });

  await test.step("RF-2 y RF-3: el sobre gratis vuela hasta «Mis sobres» y el contador de sobres sube", async () => {
    await choose(fan.locator('[data-testid="free-pack"]'), es.rewards.free.chooseSet, "PRM1 · Colección PRM1");
    await fan.locator('[data-testid="free-claim"]').click();
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(fx.sr.gotPack);
    await expect.poll(async () => (await log(fan)).sounds).toContain("pack");
    expect((await log(fan)).flights).toContain("pack>packs");
    await expect(fan.locator('[data-fly-target="packs"]:visible').first()).toContainText("3");
    await expect(fan.locator('[data-testid="free-charges"]')).toHaveText(es.rewards.free.ready(0, 2));
  });

  await test.step("RF-11: en el día de gracia la pegatina de hoy late y avisa", async () => {
    await advance(request, 48);
    await reload(fan);
    await expect(fan.locator('[data-testid="streak"]')).toHaveAttribute("data-at-risk", "true");
    await expect(fan.locator('[data-testid="streak-risk"]')).toHaveText(fx.streak.atRisk);
    await expect(fan.locator('[data-day-sticker="2"]')).toHaveClass(/streak-pulse/);
    await claimDaily(fan);
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(fx.sr.gotCookies(10, 20));
    await reload(fan);
    await expect(fan.locator('[data-testid="streak"]')).not.toHaveAttribute("data-at-risk", "true");
  });

  await test.step("RF-5, RF-12 y RF-13: el día 7 se celebra con fanfarria y vibración; al cerrar, el sobre vuela", async () => {
    let total = 20;
    for (let day = 3; day <= 6; day++) {
      await advance(request, 24);
      await reload(fan);
      await claimDaily(fan);
      const r = DAILY_SCHEDULE[day - 1];
      total += r.kind === "cookies" ? r.amount : 0;
      await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(fx.sr.gotCookies(r.kind === "cookies" ? r.amount : 0, total));
    }
    await advance(request, 24);
    await reload(fan);
    await choose(fan, es.rewards.daily.chooseSetForPack, "PRM1 · Colección PRM1");
    await claimDaily(fan);
    await expect(dialog).toBeVisible();
    // El confeti dura segundo y medio: se mira nada más abrirse.
    if (!reduced) await expect(fan.locator('[data-testid="confetti"]')).toBeAttached();
    await expect(dialog).toContainText(fx.streak.title);
    await expect(dialog.locator('[data-testid="celebration-kicker"]')).toHaveText(fx.streak.kicker);
    await expect(dialog.locator('[data-testid="celebration-count"]')).toHaveCount(0);
    await expect.poll(async () => (await log(fan)).sounds).toContain("fanfare");
    expect((await log(fan)).vibes).toEqual(["30"]);
    await dialog.locator('[data-testid="celebration-close"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(fx.sr.gotPack);
    await expect(fan.locator('[data-fly-target="packs"]:visible').first()).toContainText("4");
    await reload(fan);
    await expect(fan.locator('[data-testid="streak"] li[data-state="done"]')).toHaveCount(7);
  });

  await test.step("RF-16: si falla la red, el error va junto al botón con «Reintentar» y nada vuela", async () => {
    await advance(request, 24);
    await reload(fan);
    const before = (await log(fan)).flights.length;
    await fan.route("**/*", (route) => (route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue()));
    await claimDaily(fan);
    const error = fan.locator('[data-testid="claim-error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText(fx.failed);
    expect((await log(fan)).flights).toHaveLength(before);
    await expect(fan.locator('[data-testid="toast"]')).toHaveCount(0);
    await fan.unroute("**/*");
    await error.locator('[data-testid="claim-retry"]').click();
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(fx.sr.gotCookies(10, 100));
    await expect(error).toHaveCount(0);
  });

  await test.step("RF-14: el silencio se activa desde la cabecera y se recuerda", async () => {
    const toggle = fan.locator('[data-testid="sound-toggle-header"]');
    await expect(toggle).toHaveAttribute("data-muted", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-muted", "true");
    await reload(fan);
    await expect(fan.locator('[data-testid="sound-toggle-header"]')).toHaveAttribute("data-muted", "true");
  });

  await test.step("RF-9: en la apertura no sale ninguna celebración; en la siguiente página sí", async () => {
    await giftPacks(admin, "fan-premios", "PRM1", 1);
    await fan.goto(`/sobres/${setId}`);
    await fan.waitForLoadState("networkidle");
    await noCelebration(fan);
    await fan.goto("/recompensas");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(fx.arrivals.title(1));
    await dialog.locator('[data-testid="celebration-close"]').click();
    await expect(dialog).toHaveCount(0);
  });

  await test.step("RF-17: el panel de administración conserva sus avisos emergentes", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await choose(admin.locator('[data-testid="pack-settings"]'), es.admin.set.pack.cover, /^001 ·/);
    await expect(admin.locator('[data-testid="toast"]')).toBeVisible();
  });
});
