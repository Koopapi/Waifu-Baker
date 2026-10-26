// Criterios de finalización de la spec 021: el administrador marca una colección gratuita y otra queda de Patreon →
// el jugador gratis ve en cada colección de Patreon que llega con la suscripción (con enlace), solo puede reclamar
// sobres gratis de la gratuita, ve cómo se consigue cada colección en Probabilidades y el tercer espacio bloqueado →
// con la membresía simulada aparece la insignia en su cuenta y su álbum público y tiene 3 espacios → al perderla, no.
import type { APIRequestContext } from "@playwright/test";
import path from "node:path";
import { signPatreonBody } from "../src/domain/patreon/webhook-signature";
import { dictionaries } from "../src/i18n/index";
import { gamesDictionaries } from "../src/i18n/games";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, giftPacks, login, openAllAndSkip } from "./helpers";

const es = dictionaries.es;
const g = gamesDictionaries.es;
const SECRET = "e2e-webhook-secret";

/** Fija el estado del miembro simulado y manda el aviso firmado, como haría Patreon (igual que en patreon.spec). */
async function patreonSays(api: APIRequestContext, patreonUserId: string, state: Record<string, unknown>, nonce: string) {
  const res = await api.post("/api/dev/patreon-member", {
    data: { patreonUserId, patronStatus: "active_patron", lastChargeStatus: "Paid", lastChargeDate: "2026-10-01T10:00:00Z", nextChargeDate: "2026-11-01T10:00:00Z", entitledTierIds: ["dev-sfw"], ...state },
  });
  expect(res.status()).toBe(200);
  const { memberId } = (await res.json()) as { memberId: string };
  const body = JSON.stringify({ data: { id: memberId, type: "member" }, meta: { nonce } });
  const r = await api.post("/api/webhooks/patreon", { data: body, headers: { "content-type": "application/json", "x-patreon-signature": signPatreonBody(body, SECRET), "x-patreon-event": "members:update" } });
  expect(r.status()).toBe(200);
}

test("economía: colecciones gratuitas y de Patreon, avisos, probabilidades e insignia y tercer espacio de patron", async ({ browser, request }) => {
  const admin = await login(browser, "admin-eco", true);
  await createPublishedSet(admin, "ECO1", ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2, undefined, false, true);
  const patreon = await createPublishedSet(admin, "ECO2", ["03.webp", "04.webp", "05.webp"].map((f) => path.join(LAB, f)), 3);

  await test.step("RF-1 y RF-3: el administrador marca y desmarca una colección como gratuita", async () => {
    await admin.goto(`/admin/sets/${patreon}`);
    await admin.waitForLoadState("networkidle");
    await expect(admin.locator('[data-testid="free-badge"]')).toHaveText(es.admin.set.free.badgePatreon);
    await admin.click(`text=${es.admin.set.free.make}`);
    await expect(admin.locator('[data-testid="free-toggle"]')).toContainText(es.admin.set.free.isFree);
    await expect(admin.locator('[data-testid="toast"][data-kind="success"]')).toBeVisible();
    await admin.click(`text=${es.admin.set.free.remove}`);
    await expect(admin.locator('[data-testid="free-toggle"]')).toContainText(es.admin.set.free.isPatreon);
    await expect(async () => {
      await admin.goto("/admin/sets");
      await expect(admin.getByText(es.admin.set.free.badgeFree, { exact: true })).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  });

  await test.step("RF-8: la bienvenida es la colección de Patreon (la probadita) y el tier SFW da sobres de ella", async () => {
    await admin.goto(`/admin/sets/${patreon}`);
    await admin.waitForLoadState("networkidle");
    await admin.click(`text=${es.admin.set.welcome.make}`);
    await expect(admin.locator(`text=${es.admin.set.welcome.isWelcome}`)).toBeVisible();
    await admin.goto("/admin/tiers");
    await admin.waitForLoadState("networkidle");
    await choose(admin, es.admin.tiers.setAria("SFW (desarrollo)"), "ECO2 · Colección ECO2");
    // RF-16: la regla propone 8 sobres al mes.
    await expect(admin.locator(`form:has(label:text-is("${es.admin.tiers.setAria("SFW (desarrollo)")}")) input[name="packsPerMonth"]`)).toHaveValue("8");
    await admin.locator(`form:has(label:text-is("${es.admin.tiers.setAria("SFW (desarrollo)")}")) >> text=${es.admin.tiers.addSet}`).click();
    await expect(admin.locator(`text=${es.admin.tiers.saved}`).first()).toBeVisible();
  });

  await giftPacks(admin, "fan-eco", "ECO2", 1);
  const fan = await login(browser, "fan-eco", false, "/sobres");
  const pid = "dev:fan-eco";

  await test.step("RF-9: en «Mis sobres» la colección de Patreon dice cómo conseguir más, con enlace", async () => {
    await fan.goto("/sobres");
    const group = fan.locator('[data-testid="group-ECO2"]');
    await expect(group).toContainText("x2");
    await expect(group.locator('[data-testid="patreon-notice"]')).toContainText(es.packs.mine.patreonMore);
    await expect(group.locator('[data-testid="patreon-link"]')).toHaveAttribute("href", /patreon\.com/);
  });

  await test.step("RF-4: el sobre gratis solo ofrece la colección gratuita", async () => {
    await fan.goto("/recompensas");
    const panel = fan.locator('[data-testid="free-pack"]');
    await panel.getByRole("combobox", { name: es.rewards.free.chooseSet }).click();
    await expect(fan.getByRole("option", { name: "ECO1 · Colección ECO1" }).first()).toBeVisible();
    await expect(fan.getByRole("option", { name: /ECO2/ })).toHaveCount(0);
    await fan.getByRole("option", { name: "ECO1 · Colección ECO1" }).first().click();
    await panel.getByRole("button", { name: es.rewards.free.claim }).click();
    await expect(fan.locator('[data-testid="reward-announce"]')).toHaveText(es.rewards.fx.sr.gotPack);
    await fan.goto("/sobres");
    await expect(fan.locator('[data-testid="group-ECO1"]')).toContainText("x1");
    await expect(fan.locator('[data-testid="group-ECO1"] [data-testid="patreon-notice"]')).toHaveCount(0);
  });

  await test.step("RF-9: la lista de colecciones y el álbum de la colección de Patreon avisan y enlazan", async () => {
    await fan.goto(`/sobres/${patreon}/todos`);
    expect(await openAllAndSkip(fan)).toBe(4);
    await fan.goto("/coleccion");
    await expect(fan.locator('[data-testid="collection-ECO2"] [data-testid="patreon-notice"]')).toContainText(es.collection.patreon.notice);
    await fan.goto(`/coleccion/${patreon}`);
    await expect(fan.locator('[data-testid="patreon-notice"] [data-testid="patreon-link"]')).toHaveAttribute("href", /patreon\.com/);
  });

  await test.step("RF-10: Probabilidades dice cómo se consigue cada colección", async () => {
    await fan.goto("/drop-rates");
    await expect(fan.locator('[data-testid="how-ECO1"]')).toHaveText(es.site.dropRates.how.free);
    await expect(fan.locator('[data-testid="how-ECO2"]')).toHaveText(es.site.dropRates.how.patreon);
  });

  await test.step("RF-15: el jugador gratis ve el tercer espacio bloqueado, con enlace", async () => {
    await fan.goto("/juegos/expediciones");
    await expect(fan.locator('[data-testid="slots"]')).toHaveText(g.expeditions.slots(0, 2));
    await expect(fan.locator('[data-testid="third-slot-locked"] [data-testid="patreon-link"]')).toHaveAttribute("href", /patreon\.com/);
    await expect(fan.locator('[data-testid="patron-badge"]')).toHaveCount(0);
  });

  await test.step("RF-11 y RF-13: con la membresía activa aparece la insignia y hay 3 espacios", async () => {
    await patreonSays(request, pid, {}, "paid");
    await fan.goto("/cuenta");
    await expect(fan.locator('[data-testid="patron-badge"]')).toBeVisible();
    await fan.goto("/juegos/expediciones");
    await expect(fan.locator('[data-testid="slots"]')).toHaveText(g.expeditions.slots(0, 3));
    await expect(fan.locator('[data-testid="third-slot-locked"]')).toHaveCount(0);
    await fan.goto("/coleccion");
    await expect(fan.locator('[data-testid="collection-ECO2"] [data-testid="patreon-notice"]')).toHaveCount(0);
  });

  await test.step("RF-11: la insignia también sale en el álbum público", async () => {
    await fan.goto("/coleccion/album");
    await fan.click(`text=${es.collection.album.activate}`);
    await expect(fan.locator('[data-testid="album-url"]')).toBeVisible();
    const albumUrl = new URL(await fan.locator('[data-testid="album-url"]').inputValue()).pathname;
    const anon = await (await browser.newContext()).newPage();
    await anon.goto(albumUrl);
    await expect(anon.locator('[data-testid="album-alias"]')).toBeVisible();
    await expect(anon.locator('[data-testid="patron-badge"]')).toBeVisible();
  });

  await test.step("RF-12 y RF-14: al perder la membresía se van la insignia y el tercer espacio", async () => {
    await patreonSays(request, pid, { patronStatus: "former_patron" }, "left");
    await fan.goto("/cuenta");
    await expect(fan.locator('[data-testid="patron-badge"]')).toHaveCount(0);
    await fan.goto("/juegos/expediciones");
    await expect(fan.locator('[data-testid="slots"]')).toHaveText(g.expeditions.slots(0, 2));
    await expect(fan.locator('[data-testid="third-slot-locked"]')).toBeVisible();
  });
});
