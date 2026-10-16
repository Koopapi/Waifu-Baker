// Criterios de finalización de la spec 012: el administrador oculta un álbum con motivo → el visitante ve
// «Este álbum no está disponible» → el dueño lo ve en «Mi cuenta» y en los ajustes → pide revisión con otro
// alias → el administrador la rechaza → el dueño espera 7 días (reloj simulado) y vuelve a pedirla → el
// administrador la aprueba y el mismo enlace vuelve a funcionar con el alias nuevo.
import type { APIRequestContext, Page } from "@playwright/test";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

const es = dictionaries.es;
const ta = es.admin.albums;
const tm = es.collection.album.moderation;

const shot = (p: Page, name: string, fullPage = false) =>
  p.screenshot({ path: `test-results/screens/${test.info().project.name}/s012-${name}.png`, fullPage });

const advance = async (api: APIRequestContext, hours: number) => expect((await api.post("/api/dev/clock", { data: { advanceHours: hours } })).status()).toBe(200);

async function requestReview(fan: Page, alias: string) {
  await fan.goto("/coleccion/album");
  await fan.waitForLoadState("networkidle");
  const box = fan.locator('[data-testid="album-moderation"]');
  await box.locator('input[name="alias"]').fill(alias);
  await box.getByRole("button", { name: tm.request }).click();
}

async function openDetail(admin: Page) {
  await admin.goto("/admin/albumes?q=fan-mod");
  await admin.locator('[data-testid="albums-table"] a').first().click();
  await expect(admin).toHaveURL(/\/admin\/albumes\/[0-9a-f-]{36}$/);
  await admin.waitForLoadState("networkidle");
}

test("moderación de álbumes: ocultar, pedir revisión, rechazar y aprobar", async ({ browser, request }) => {
  const fan = await login(browser, "fan-mod", false, "/coleccion/album");
  const admin = await login(browser, "admin-mod", true);

  let url = "";
  await test.step("el dueño activa su álbum público", async () => {
    await fan.goto("/coleccion/album");
    await fan.fill('input[name="alias"]', "Alias Feo");
    await fan.click("text=Activar álbum público");
    await expect(fan.locator("text=Álbum público activado.")).toBeVisible();
    url = await fan.locator('[data-testid="album-url"]').inputValue();
  });

  await test.step("RF-1: la sección «Álbumes» lista el álbum con su estado y busca por dueño", async () => {
    await admin.goto("/admin");
    await admin.locator("nav >> text=Álbumes").first().click();
    await expect(admin).toHaveURL(/\/admin\/albumes$/);
    const table = admin.locator('[data-testid="albums-table"]');
    await expect(table).toContainText("Alias Feo");
    await expect(table).toContainText("fan-mod");
    await expect(table).toContainText(ta.status.none);
    await admin.goto("/admin/albumes?q=nadie");
    await expect(admin.locator(`text=${ta.noMatch("nadie")}`)).toBeVisible();
  });

  await test.step("RF-4: ocultar pide motivo, nota y confirmación", async () => {
    await openDetail(admin);
    await expect(admin.locator("h1")).toHaveText(ta.detailTitle("Alias Feo"));
    const form = admin.locator('[data-testid="hide-album-form"]');
    await form.getByRole("radio", { name: tm.reasons.impersonation }).click();
    await form.getByLabel(ta.note).fill("Usa el nombre de otra persona.");
    await shot(admin, "1-ocultar");
    await form.getByRole("button", { name: ta.hide }).click();
    const dialog = admin.getByRole("alertdialog");
    await expect(dialog).toContainText(ta.confirmHide("Alias Feo"));
    await dialog.locator('[data-testid="confirm-accept"]').click();
    await expect(admin.locator(`text=${ta.hidden}`)).toBeVisible();
    await expect(admin.locator("main")).toContainText(ta.status.hidden);
  });

  const anon = await (await browser.newContext()).newPage();
  await test.step("RF-5 y RF-6: el visitante ve «no disponible», sin alias", async () => {
    const res = await anon.goto(url);
    expect(res?.status()).toBe(404);
    await expect(anon.locator('[data-testid="album-unavailable"] h1')).toHaveText(es.collection.publicAlbum.unavailable);
    expect(await anon.content()).not.toContain("Alias Feo");
  });

  await test.step("RF-7: el dueño ve el aviso en «Mi cuenta» y el motivo en los ajustes", async () => {
    await fan.goto("/cuenta");
    const alert = fan.locator('[data-testid="account-album-hidden"]');
    await expect(alert).toContainText(es.account.albumHidden);
    await alert.getByRole("link", { name: es.account.albumHiddenLink }).click();
    await expect(fan).toHaveURL(/\/coleccion\/album$/);
    const box = fan.locator('[data-testid="album-moderation"]');
    await expect(box).toContainText(tm.hiddenBody(tm.reasons.impersonation));
    await expect(box).toContainText(tm.adminNote("Usa el nombre de otra persona."));
    await expect(fan.locator('[data-testid="album-status"]')).toHaveCount(0);
    await shot(fan, "2-dueno-oculto", true);
  });

  await test.step("RF-8 y RF-9: pedir revisión exige otro alias y queda pendiente", async () => {
    await requestReview(fan, "alias feo");
    await expect(fan.locator(`text=${es.errors.same_alias}`)).toBeVisible();
    await requestReview(fan, "Alias Nuevo");
    await expect(fan.locator(`text=${tm.requestSent}`)).toBeVisible();
    await fan.reload();
    await expect(fan.locator('[data-testid="album-moderation"]')).toContainText(tm.requestedBody("Alias Nuevo"));
    await expect(fan.locator('[data-testid="album-moderation"] input[name="alias"]')).toHaveCount(0);
  });

  await test.step("RF-2 y RF-12: la revisión aparece primero y el administrador la rechaza con una nota", async () => {
    await admin.goto("/admin/albumes");
    await expect(admin.locator('[data-testid="albums-table"]')).toContainText(ta.status.review_requested);
    await openDetail(admin);
    const decision = admin.locator('[data-testid="review-decision"]');
    await expect(admin.locator("main")).toContainText(ta.proposedAlias("Alias Nuevo"));
    await decision.getByLabel(ta.rejectNote).fill("Sigue pareciendo otra persona.");
    await decision.getByRole("button", { name: ta.reject }).click();
    await expect(admin.locator(`text=${ta.rejected}`)).toBeVisible();
    await fan.goto("/coleccion/album");
    const box = fan.locator('[data-testid="album-moderation"]');
    await expect(box).toContainText(tm.rejectedTitle);
    await expect(box).toContainText(tm.adminNote("Sigue pareciendo otra persona."));
  });

  await test.step("RF-10: hay que esperar 7 días para pedir otra revisión", async () => {
    await requestReview(fan, "Alias Bueno");
    await expect(fan.locator("text=Ya pediste una revisión hace poco.")).toBeVisible();
    await advance(request, 7 * 24 + 1);
    await requestReview(fan, "Alias Bueno");
    await expect(fan.locator(`text=${tm.requestSent}`)).toBeVisible();
  });

  await test.step("RF-11 y RF-3: aprobar publica el alias nuevo y queda en el historial", async () => {
    await openDetail(admin);
    await admin.locator('[data-testid="review-decision"]').getByRole("button", { name: ta.approve }).click();
    await expect(admin.locator(`text=${ta.approved}`)).toBeVisible();
    await admin.reload();
    const history = admin.locator('[data-testid="moderation-history"] li');
    await expect(history).toHaveCount(5);
    await expect(history.first()).toContainText(ta.actions["album.review_approve"]);
    await expect(history.first()).toContainText(ta.aliasChange("Alias Feo", "Alias Bueno"));
    await expect(history.last()).toContainText(ta.actions["album.hide"]);
    await shot(admin, "3-historial", true);
  });

  await test.step("RF-6 y RF-11: el mismo enlace vuelve a funcionar con el alias nuevo", async () => {
    const res = await anon.goto(url);
    expect(res?.status()).toBe(200);
    await expect(anon.locator('[data-testid="album-alias"]')).toHaveText("Alias Bueno");
    await fan.goto("/cuenta");
    await expect(fan.locator('[data-testid="account-album-hidden"]')).toHaveCount(0);
  });
});
