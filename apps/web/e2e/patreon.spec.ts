// Criterios de finalización de la spec 001: un usuario nuevo entra → recibe el sobre de bienvenida de la
// colección elegida en el panel → un aviso firmado simulado de un cobro pagado le concede los sobres de su
// tier → el aviso repetido no concede más → un reembolso anula los sellados → declara su edad con el tier
// adulto y ve la colección 18+ → borra su cuenta y la recupera al volver antes de 30 días.
import type { APIRequestContext, Page } from "@playwright/test";
import path from "node:path";
import { signPatreonBody } from "../src/domain/patreon/webhook-signature";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, dismissCelebration, login, tick } from "./helpers";

const es = dictionaries.es;
const SECRET = "e2e-webhook-secret";

/** Fija el estado del miembro simulado y manda el aviso firmado, como haría Patreon. */
async function patreonSays(api: APIRequestContext, patreonUserId: string, state: Record<string, unknown>, nonce: string) {
  const res = await api.post("/api/dev/patreon-member", {
    data: {
      patreonUserId,
      patronStatus: "active_patron",
      lastChargeStatus: "Paid",
      lastChargeDate: "2026-10-01T10:00:00Z",
      nextChargeDate: "2026-11-01T10:00:00Z",
      entitledTierIds: ["dev-sfw"],
      ...state,
    },
  });
  expect(res.status()).toBe(200);
  const { memberId } = (await res.json()) as { memberId: string };
  const body = JSON.stringify({ data: { id: memberId, type: "member" }, meta: { nonce } });
  return { memberId, body, signature: signPatreonBody(body, SECRET) };
}

const webhook = (api: APIRequestContext, body: string, signature: string) =>
  api.post("/api/webhooks/patreon", { data: body, headers: { "content-type": "application/json", "x-patreon-signature": signature, "x-patreon-event": "members:update" } });

const packsOf = async (p: Page, code: string) => {
  await p.goto("/sobres");
  await p.waitForLoadState("networkidle");
  // Los sobres recién llegados abren su celebración, que deja inerte el resto de la página (spec 015, RF-6).
  await dismissCelebration(p);
  const g = p.locator(`[data-testid="group-${code}"]`);
  return (await g.count()) ? Number((await g.locator("span.tabular-nums").first().innerText()).replace("x", "")) : 0;
};

test("cuentas con Patreon: bienvenida, sobres por cobro, reembolso, 18+ y borrado", async ({ browser, request }) => {
  const admin = await login(browser, "admin-patreon", true);
  const setId = await createPublishedSet(admin, "PAT1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await createPublishedSet(admin, "PAT1A", ["04.webp", "05.webp"].map((f) => path.join(LAB, f)), 2, undefined, true);

  await test.step("RF-5: el administrador elige la colección de bienvenida", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await admin.waitForLoadState("networkidle");
    await admin.click(`text=${es.admin.set.welcome.make}`);
    await expect(admin.locator(`text=${es.admin.set.welcome.isWelcome}`)).toBeVisible();
    // Spec 011, RF-10: el cambio se ve al instante; el aviso de éxito llega cuando el servidor lo guardó.
    await expect(admin.locator('[data-testid="toast"][data-kind="success"]')).toBeVisible();
    // Tras guardar, la página pide sus datos de nuevo y en WebKit esa recarga puede cortar la navegación
    // siguiente: se reintenta hasta llegar a la lista con la marca de bienvenida.
    await expect(async () => {
      await admin.goto("/admin/sets");
      await expect(admin.locator('[data-testid="welcome-badge"]')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  });

  await test.step("Reglas de tiers: SFW da 3 de PAT1; 18+ da 3 de PAT1A", async () => {
    await admin.goto("/admin/tiers");
    await admin.waitForLoadState("networkidle");
    for (const [tier, label] of [
      ["SFW (desarrollo)", "PAT1 · Colección PAT1"],
      ["18+ (desarrollo)", "PAT1A · Colección PAT1A (18+)"],
    ]) {
      await choose(admin, es.admin.tiers.setAria(tier), label);
      await admin.locator(`form:has(label:text-is("${es.admin.tiers.setAria(tier)}")) >> text=${es.admin.tiers.addSet}`).click();
      await expect(admin.locator(`text=${es.admin.tiers.saved}`).first()).toBeVisible();
    }
  });

  const fan = await login(browser, "fan-patreon", false, "/sobres");
  const pid = "dev:fan-patreon";

  await test.step("RF-6: al entrar por primera vez recibe 1 sobre de bienvenida", async () => {
    expect(await packsOf(fan, "PAT1")).toBe(1);
  });

  let paid = { body: "", signature: "" };
  await test.step("RF-16: un aviso sin firma válida se rechaza sin cambiar nada", async () => {
    paid = await patreonSays(request, pid, {}, "paid");
    const res = await webhook(request, paid.body, "0".repeat(32));
    expect(res.status()).toBe(401);
    expect(await packsOf(fan, "PAT1")).toBe(1);
  });

  await test.step("RF-9 y RF-15: el aviso firmado de un cobro pagado concede los sobres del tier", async () => {
    const res = await webhook(request, paid.body, paid.signature);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ outcome: "applied" });
    expect(await packsOf(fan, "PAT1")).toBe(4);
  });

  await test.step("RF-15: el mismo aviso repetido no concede más", async () => {
    const res = await webhook(request, paid.body, paid.signature);
    expect(await res.json()).toEqual({ outcome: "duplicate" });
    const again = await patreonSays(request, pid, {}, "paid-otra-vez");
    await webhook(request, again.body, again.signature);
    expect(await packsOf(fan, "PAT1")).toBe(4);
  });

  await test.step("RF-21: «Mi cuenta» muestra tier, estado, sobres al mes y último cobro", async () => {
    await fan.goto("/cuenta");
    await expect(fan.locator('[data-testid="account-tiers"]')).toHaveText("SFW (desarrollo)");
    await expect(fan.locator('[data-testid="account-status"]')).toHaveText(es.account.statusLabel.active_patron);
    await expect(fan.locator('[data-testid="account-packs"]')).toHaveText("3");
    await expect(fan.locator('[data-testid="account-last-charge"]')).toContainText("Paid");
  });

  await test.step("RF-14: un reembolso anula los sellados de ese cobro (la bienvenida se queda)", async () => {
    const refund = await patreonSays(request, pid, { lastChargeStatus: "Refunded" }, "refund");
    expect((await (await webhook(request, refund.body, refund.signature)).json()).outcome).toBe("applied");
    expect(await packsOf(fan, "PAT1")).toBe(1);
  });

  await test.step("RF-26: el panel muestra el estado de Patreon y el historial con las anulaciones", async () => {
    await admin.goto("/admin/users?q=fan-patreon");
    await admin.click("a:text-is('fan-patreon')");
    await expect(admin.locator('[data-testid="patreon-state"]')).toContainText("Refunded");
    await expect(admin.locator('[data-testid="pack-history"] li[data-status="void"]')).toHaveCount(3);
  });

  await test.step("RF-10 y RF-18: sube al tier 18+, recibe la diferencia, declara su edad y ve la colección 18+", async () => {
    const upgrade = await patreonSays(request, pid, { entitledTierIds: ["dev-adult"], lastChargeDate: "2026-10-15T10:00:00Z" }, "upgrade");
    await webhook(request, upgrade.body, upgrade.signature);
    expect(await packsOf(fan, "PAT1A")).toBe(3);
    await expect(fan.locator('[data-testid="group-PAT1A"]')).toContainText(es.packs.mine.locked.slice(0, 20));
    await fan.goto("/cuenta");
    await tick(fan.locator('[data-testid="declare-adult"]'), es.account.adult.confirm);
    await fan.click(`text=${es.account.adult.submit}`);
    await expect(fan.locator(`text=${es.account.adult.verified}`)).toBeVisible();
    await fan.goto("/sobres");
    await expect(fan.locator('[data-testid="group-PAT1A"] >> text=Abrir un sobre')).toBeVisible();
  });

  await test.step("RF-22 y RF-23: borra su cuenta y la recupera al volver antes de 30 días", async () => {
    await fan.goto("/cuenta");
    await fan.click('[data-testid="delete-account"]');
    // Spec 011, RF-12: confirmación en el modal propio.
    await fan.click('[data-testid="confirm-accept"]');
    await fan.waitForURL((u) => u.pathname === "/");
    await fan.goto("/sobres");
    await expect(fan).toHaveURL(/\/login/);
    const back = await login(browser, "fan-patreon", false, "/sobres");
    expect(await packsOf(back, "PAT1A")).toBe(3);
    expect(await packsOf(back, "PAT1")).toBe(1);
  });
});
