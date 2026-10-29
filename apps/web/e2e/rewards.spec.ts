// Criterios de finalización de la spec 009: un usuario nuevo ve 1 sobre gratis listo → lo reclama eligiendo
// colección y lo abre → ve la cuenta atrás → reclama la recompensa del día y recibe 10 galletas → no puede
// reclamarla otra vez ese día → con el reloj simulado avanza la racha hasta el día 7 y recibe un sobre → un
// hueco de dos días reinicia la racha → el administrador ve y ajusta sus galletas.
import type { APIRequestContext, Page } from "@playwright/test";
import path from "node:path";
import { DAILY_SCHEDULE } from "../src/domain/rewards/daily";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { choose, createPublishedSet, LAB, login, openDeck, tear } from "./helpers";

const es = dictionaries.es.rewards;

const advance = async (api: APIRequestContext, hours: number) => expect((await api.post("/api/dev/clock", { data: { advanceHours: hours } })).status()).toBe(200);

async function reload(p: Page) {
  await p.goto("/packs");
  await p.waitForLoadState("networkidle");
}

async function claimDaily(p: Page) {
  await p.locator('[data-testid="daily"]').getByRole("button", { name: es.daily.claim }).click();
}

test("sobres gratis con espera y recompensa diaria", async ({ browser, request }) => {
  const admin = await login(browser, "admin-rewards", true);
  // Spec 021: solo las colecciones gratuitas salen en el sobre cada 12 h y el día 7.
  await createPublishedSet(admin, "FREE1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3, undefined, false, true);
  const fan = await login(browser, "fan-rewards", false, "/packs");
  await reload(fan);

  await test.step("RF-3 y RF-5: un usuario nuevo tiene 1 sobre gratis listo", async () => {
    await expect(fan.locator('[data-testid="free-charges"]')).toHaveText(es.free.ready(1, 2));
    await expect(fan.locator('[data-testid="free-pack"] [data-testid="countdown"]')).toBeVisible();
  });

  await test.step("RF-4 y RF-8: lo reclama eligiendo colección y lo abre", async () => {
    await choose(fan.locator('[data-testid="free-pack"]'), es.free.chooseSet, "FREE1 · Colección FREE1");
    await fan.locator('[data-testid="free-pack"]').getByRole("button", { name: es.free.claim }).click();
    // Spec 015: sin aviso emergente; el premio vuela y se anuncia a los lectores de pantalla.
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(es.fx.sr.gotPack);
    await expect(fan.locator('[data-testid="group-FREE1"]')).toContainText("x1");
    await fan.click('[data-testid="group-FREE1"] >> text=Abrir un sobre');
    await tear(fan);
    await openDeck(fan);
  });

  await test.step("RF-5 y RF-6: sin cargas, se ve la cuenta atrás y no se puede reclamar", async () => {
    await reload(fan);
    await expect(fan.locator('[data-testid="free-charges"]')).toHaveText(es.free.ready(0, 2));
    await expect(fan.locator('[data-testid="free-pack"] [data-testid="countdown"]')).toBeVisible();
    await expect(fan.locator('[data-testid="free-pack"]').getByRole("button", { name: es.free.claim })).toBeDisabled();
  });

  await test.step("RF-1: a las 12 horas hay otro listo", async () => {
    await advance(request, 12);
    await reload(fan);
    await expect(fan.locator('[data-testid="free-charges"]')).toHaveText(es.free.ready(1, 2));
  });

  await test.step("RF-9 y RF-10: la recompensa del día da 10 galletas y solo una vez", async () => {
    await expect(fan.locator('[data-testid="streak"] li[data-day="1"]')).toHaveAttribute("data-state", "current");
    await claimDaily(fan);
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(es.fx.sr.gotCookies(10, 10));
    await reload(fan);
    await expect(fan.locator('[data-testid="cookie-balance"]')).toHaveText(es.cookies.balance(10));
    await expect(fan.locator(`[data-testid="daily"] >> text=${es.daily.claimed}`)).toBeVisible();
    await expect(fan.locator('[data-testid="daily"]').getByRole("button", { name: es.daily.claim })).toHaveCount(0);
  });

  await test.step("RF-12, RF-14 y RF-15: la racha avanza cada día hasta el sobre del día 7", async () => {
    let total = 10;
    for (let day = 2; day <= 6; day++) {
      await advance(request, 24);
      await reload(fan);
      await expect(fan.locator(`[data-testid="streak"] li[data-day="${day}"]`)).toHaveAttribute("data-state", "current");
      await claimDaily(fan);
      const reward = DAILY_SCHEDULE[day - 1];
      total += reward.kind === "cookies" ? reward.amount : 0;
      await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(es.fx.sr.gotCookies(reward.kind === "cookies" ? reward.amount : 0, total));
    }
    await advance(request, 24);
    await reload(fan);
    await expect(fan.locator('[data-testid="cookie-balance"]')).toHaveText(es.cookies.balance(90));
    await choose(fan, es.daily.chooseSetForPack, "FREE1 · Colección FREE1");
    await claimDaily(fan);
    // Spec 015, RF-5: el día 7 se celebra en el centro; al cerrar, el sobre vuela a la navegación.
    const celebration = fan.locator('[data-testid="celebration-dialog"]');
    await expect(celebration).toBeVisible();
    await expect(celebration).toContainText(es.fx.streak.title);
    await celebration.locator('[data-testid="celebration-close"]').click();
    await expect(celebration).toHaveCount(0);
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(es.fx.sr.gotPack);
    await reload(fan);
    await expect(fan.locator('[data-testid="streak"] li[data-state="done"]')).toHaveCount(7);
  });

  await test.step("RF-13: dos días sin reclamar reinician la racha", async () => {
    await advance(request, 72);
    await reload(fan);
    await expect(fan.locator('[data-testid="streak"] li[data-day="1"]')).toHaveAttribute("data-state", "current");
    await expect(fan.locator('[data-testid="cookie-balance"]')).toHaveText(es.cookies.balance(90));
  });

  await test.step("RF-16: «Mi cuenta» muestra el saldo y el historial de galletas", async () => {
    await fan.goto("/account");
    await expect(fan.locator('[data-testid="account-cookies"]')).toContainText(es.cookies.balance(90));
    await expect(fan.locator('[data-testid="account-cookies"] li')).toHaveCount(6);
  });

  await test.step("RF-20 y RF-21: el administrador ve y ajusta las galletas", async () => {
    await admin.goto("/admin/users?q=fan-rewards");
    await admin.click("a:text-is('fan-rewards')");
    await expect(admin.locator('[data-testid="user-cookies"]')).toHaveText(dictionaries.es.admin.users.rewards.cookies(90));
    await admin.fill('[data-testid="cookies-form"] input[name="amount"]', "5");
    await admin.fill('[data-testid="cookies-form"] input[name="reason"]', "Premio de la beta");
    await admin.click(`[data-testid="cookies-form"] >> text=${dictionaries.es.admin.users.rewards.submit}`);
    await expect(admin.locator(`text=${dictionaries.es.admin.users.rewards.adjusted(95)}`)).toBeVisible();
  });
});
