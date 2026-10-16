// Criterios de finalización de la spec 009: un usuario nuevo ve 1 sobre gratis listo → lo reclama eligiendo
// colección y lo abre → ve la cuenta atrás → reclama la recompensa del día y recibe 10 galletas → no puede
// reclamarla otra vez ese día → con el reloj simulado avanza la racha hasta el día 7 y recibe un sobre → un
// hueco de dos días reinicia la racha → el administrador ve y ajusta sus galletas.
import type { APIRequestContext, Page } from "@playwright/test";
import path from "node:path";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, login, tear } from "./helpers";

const es = dictionaries.es.rewards;

const advance = async (api: APIRequestContext, hours: number) => expect((await api.post("/api/dev/clock", { data: { advanceHours: hours } })).status()).toBe(200);

async function reload(p: Page) {
  await p.goto("/sobres");
  await p.waitForLoadState("networkidle");
}

async function claimDaily(p: Page) {
  await p.locator('[data-testid="daily"]').getByRole("button", { name: es.daily.claim }).click();
}

test("sobres gratis con espera y recompensa diaria", async ({ browser, request }) => {
  const admin = await login(browser, "admin-rewards", true);
  await createPublishedSet(admin, "FREE1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  const fan = await login(browser, "fan-rewards", false, "/sobres");
  await reload(fan);

  await test.step("RF-3 y RF-5: un usuario nuevo tiene 1 sobre gratis listo", async () => {
    await expect(fan.locator('[data-testid="free-charges"]')).toHaveText(es.free.ready(1, 2));
    await expect(fan.locator('[data-testid="free-pack"] [data-testid="countdown"]')).toBeVisible();
  });

  await test.step("RF-4 y RF-8: lo reclama eligiendo colección y lo abre", async () => {
    await choose(fan.locator('[data-testid="free-pack"]'), es.free.chooseSet, "FREE1 · Colección FREE1");
    await fan.locator('[data-testid="free-pack"]').getByRole("button", { name: es.free.claim }).click();
    await expect(fan.locator(`text=${es.free.claimed}`)).toBeVisible();
    await expect(fan.locator('[data-testid="group-FREE1"]')).toContainText("x1");
    await fan.click('[data-testid="group-FREE1"] >> text=Abrir un sobre');
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="fanned"]')).toBeVisible();
    for (let k = 0; k < 2; k++) {
      await fan.locator('.card3d[role="button"]').first().click();
      await expect(fan.locator(`.stage[data-revealed="${k + 1}"]`)).toBeVisible();
    }
    await expect(fan.locator(".summary")).toBeVisible();
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
    await expect(fan.locator(`text=${es.daily.gotCookies(10)}`)).toBeVisible();
    await reload(fan);
    await expect(fan.locator('[data-testid="cookie-balance"]')).toHaveText(es.cookies.balance(10));
    await expect(fan.locator(`[data-testid="daily"] >> text=${es.daily.claimed}`)).toBeVisible();
    await expect(fan.locator('[data-testid="daily"]').getByRole("button", { name: es.daily.claim })).toHaveCount(0);
  });

  await test.step("RF-12, RF-14 y RF-15: la racha avanza cada día hasta el sobre del día 7", async () => {
    for (let day = 2; day <= 6; day++) {
      await advance(request, 24);
      await reload(fan);
      await expect(fan.locator(`[data-testid="streak"] li[data-day="${day}"]`)).toHaveAttribute("data-state", "current");
      await claimDaily(fan);
      await expect(fan.locator('[data-testid="daily"] [role="status"]')).toBeVisible();
    }
    await advance(request, 24);
    await reload(fan);
    await expect(fan.locator('[data-testid="cookie-balance"]')).toHaveText(es.cookies.balance(90));
    await choose(fan, es.daily.chooseSetForPack, "FREE1 · Colección FREE1");
    await claimDaily(fan);
    await expect(fan.locator(`text=${es.daily.gotPack}`)).toBeVisible();
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
    await fan.goto("/cuenta");
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
