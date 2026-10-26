// Criterios de finalización de la spec 020: el administrador da terreno y rol a la personaje, crea dos zonas (una con
// niebla) y prueba el simulador → el coleccionista entra en «Juegos», ve el mapa, arma un equipo viendo la calificación,
// lo envía, no puede usar una carta ocupada ni un tercer espacio, cancela un equipo → con el reloj adelantado reclama,
// ve el reporte y el sobre ganado → abre la zona con niebla → ve el vínculo en la ficha y las probabilidades públicas.
import type { APIRequestContext, Locator, Page } from "@playwright/test";
import path from "node:path";
import { gamesDictionaries } from "../src/i18n/games";
import { expect, test } from "./fixtures";
import { LAB, choose, createPublishedSet, dismissCelebration, giftPacks, login, openAllAndSkip } from "./helpers";

const g = gamesDictionaries.es;
const advance = async (api: APIRequestContext, hours: number) => expect((await api.post("/api/dev/clock", { data: { advanceHours: hours } })).status()).toBe(200);

/** Rellena el formulario de zona nueva del panel. */
async function createZone(admin: Page, z: { name: string; terrain: string; difficulty: number; fragments: number; order: number; pack30: number }) {
  const form = admin.locator('[data-testid="new-zone-form"]');
  await form.locator('input[name="name"]').fill(z.name);
  await choose(form, g.admin.terrain, z.terrain);
  await form.locator('input[name="difficulty"]').fill(String(z.difficulty));
  await form.locator('input[name="fragmentsRequired"]').fill(String(z.fragments));
  await form.locator('input[name="sortOrder"]').fill(String(z.order));
  await form.locator('input[name="pack_30"]').fill(String(z.pack30));
  await form.getByRole("button", { name: g.admin.create }).click();
  await expect(admin.locator(`[data-testid="zone-row"][data-zone="${z.name}"]`)).toBeVisible();
}

const pin = (p: Page, name: string) => p.locator(`[data-testid="zone-pin"][data-zone="${name}"]`);

async function openPrepare(p: Page, zone: string) {
  await pin(p, zone).click();
  const dialog = p.locator('[data-testid="prepare"]');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function pickAndSend(dialog: Locator, index: number, duration: 30 | 120) {
  await dialog.locator('[data-testid="pick-card"]:not([disabled])').nth(index).click();
  await dialog.locator(`[data-testid="duration-${duration}"]`).click();
  await dialog.locator('[data-testid="send"]').click();
  await expect(dialog).toBeHidden();
}

test("expediciones: zonas en el panel, equipo, envío, reclamo con reporte y sobre, zona con niebla y ficha", async ({ browser, request }) => {
  const admin = await login(browser, "admin-expe", true);
  const setId = await createPublishedSet(admin, "EXPE", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3, undefined, false, true);
  await giftPacks(admin, "fan-expe", "EXPE", 2);

  await test.step("RF-27: el administrador asigna terreno y rol a la personaje", async () => {
    await admin.goto("/admin/characters");
    const row = admin.locator("details", { hasText: "Personaje EXPE" });
    await row.locator("summary").click();
    await choose(row, g.admin.characterTerrain, g.terrain.city);
    await choose(row, g.admin.characterRole, g.role.treasure_hunter);
    await row.getByRole("button", { name: "Guardar" }).click();
    await expect(row.getByText("Cambios guardados.")).toBeVisible();
  });

  await test.step("RF-28 y RF-29: crea una zona abierta (con sobre seguro a 30 min) y otra con niebla", async () => {
    await admin.goto("/admin/expediciones");
    await createZone(admin, { name: "Puerto Miel", terrain: g.terrain.city, difficulty: 10, fragments: 0, order: 1, pack30: 100 });
    await createZone(admin, { name: "Ruinas", terrain: g.terrain.ruins, difficulty: 80, fragments: 1, order: 2, pack30: 1 });
  });

  await test.step("RF-30: el simulador muestra calificación, botín y sobres al día", async () => {
    const sim = admin.locator('[data-testid="simulator"]');
    await choose(sim, g.admin.simZone, "Puerto Miel");
    await choose(sim, g.admin.simDuration, "30 min");
    await sim.locator('[data-testid="simulate"]').click();
    const result = sim.locator('[data-testid="simulation-result"]');
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("data-rating", "good");
    await expect(result).toContainText(/100\s%/);
  });

  const fan = await login(browser, "fan-expe", false, "/sobres");
  await fan.goto(`/sobres/${setId}/todos`);
  expect(await openAllAndSkip(fan)).toBe(4);

  await test.step("RF-1: «Juegos» en la navegación con Expediciones como primer juego", async () => {
    await fan.goto("/juegos");
    await expect(fan.locator('a[href="/juegos"]').first()).toBeVisible();
    await fan.locator('[data-testid="game-expeditions"]').click();
    await fan.waitForURL("**/juegos/expediciones");
  });

  await test.step("RF-3, RF-4 y RF-6: el mapa enseña la zona abierta y la de niebla con los fragmentos que faltan", async () => {
    await expect(pin(fan, "Puerto Miel")).toHaveAttribute("data-state", "open");
    await expect(pin(fan, "Ruinas")).toHaveAttribute("data-state", "fog");
    await expect(fan.locator('[data-testid="fog-zone"][data-zone="Ruinas"] [data-testid="unlock"]')).toBeDisabled();
  });

  await test.step("RF-7, RF-10 y RF-14: arma un equipo viendo la calificación y el botín de cada duración", async () => {
    const dialog = await openPrepare(fan, "Puerto Miel");
    // Las cartas de Ciudad salen primero; al elegir una, aparecen poder, calificación y botín.
    await dialog.locator('[data-testid="pick-card"]').first().click();
    await expect(dialog.locator('[data-testid="team-member"]')).toHaveCount(1);
    await expect(dialog.locator('[data-testid="rating"]')).toHaveAttribute("data-rating", "excellent");
    await expect(dialog.locator('[data-testid="duration-120"] [data-testid="loot-cookies"]')).toContainText("galletas");
    // Quitarla vacía el equipo.
    await dialog.locator('[data-testid="team-member"]').click();
    await expect(dialog.locator('[data-testid="team-member"]')).toHaveCount(0);
    await fan.keyboard.press("Escape");
  });

  await test.step("RF-15: lo envía 30 min y queda en camino con su cuenta atrás", async () => {
    await pickAndSend(await openPrepare(fan, "Puerto Miel"), 0, 30);
    await expect(fan.locator('[data-testid="team"]')).toHaveCount(1);
    await expect(fan.locator('[data-testid="team"]').first()).toHaveAttribute("data-ready", "0");
    await expect(pin(fan, "Puerto Miel")).toHaveAttribute("data-state", "out");
  });

  await test.step("RF-8 y RF-16: la carta fuera no se puede elegir y sin espacio libre no se envía", async () => {
    const dialog = await openPrepare(fan, "Puerto Miel");
    await expect(dialog.locator('[data-testid="pick-card"][disabled]')).toHaveCount(1);
    await pickAndSend(dialog, 0, 120);
    await expect(fan.locator('[data-testid="slots"]')).toHaveText(g.expeditions.slots(2, 2));
    const third = await openPrepare(fan, "Puerto Miel");
    await expect(third.getByText(g.prepare.noSlot)).toBeVisible();
    await expect(third.locator('[data-testid="send"]')).toBeDisabled();
    await fan.keyboard.press("Escape");
  });

  await test.step("RF-18: cancela el segundo equipo y las cartas vuelven sin botín", async () => {
    const second = fan.locator('[data-testid="team"]').nth(1);
    await second.locator('[data-testid="cancel"]').click();
    await fan.getByRole("button", { name: g.expeditions.cancelConfirm }).click();
    await expect(fan.locator('[data-testid="team"]')).toHaveCount(1);
    await expect(fan.locator('[data-testid="slots"]')).toHaveText(g.expeditions.slots(1, 2));
  });

  await test.step("RF-19: antes de la vuelta no se puede reclamar", async () => {
    await expect(fan.locator('[data-testid="team"] [data-testid="claim"]')).toHaveCount(0);
  });

  await test.step("RF-2: con el reloj adelantado, «Juegos» cuenta el equipo que volvió", async () => {
    await advance(request, 1);
    await fan.goto("/juegos/expediciones");
    await fan.waitForLoadState("networkidle");
    await expect(fan.locator('[data-testid="team"]').first()).toHaveAttribute("data-ready", "1");
    await expect(fan.locator('a[href="/juegos"]').first()).toContainText("1");
  });

  await test.step("RF-20, RF-21, RF-23 y RF-24: reclama, ve el reporte y el sobre que encontraron", async () => {
    await fan.locator('[data-testid="claim"]').click();
    const report = fan.locator('[data-testid="expedition-report"]');
    await expect(report).toBeVisible();
    await expect(report.locator('[data-testid="report-phrase"]')).toHaveCount(1);
    await expect(report.locator('[data-testid="report-cookies"]')).toHaveText(/^\+\d+$/);
    await expect(report.locator('[data-testid="report-fragments"]')).toHaveText("+1");
    await expect(report.locator('[data-testid="report-pack"]')).toBeVisible();
    await expect(report.locator('[data-testid="report-bonds"]')).toBeVisible();
    await report.locator('[data-testid="report-done"]').click();
    await expect(report).toBeHidden();
    // Reclamado una vez: ya no hay botón de reclamar.
    await expect(fan.locator('[data-testid="claim"]')).toHaveCount(0);
  });

  await test.step("RF-22: el sobre ganado se celebra y llega a «Mis sobres»", async () => {
    const celebration = fan.locator('[data-testid="celebration-dialog"]');
    await expect(celebration).toBeVisible();
    await expect(celebration).toContainText(g.report.packTitle);
    await dismissCelebration(fan, 10_000);
    await fan.goto("/sobres");
    await expect(fan.locator('[data-testid="group-EXPE"]')).toBeVisible();
  });

  await test.step("RF-5: con el fragmento ganado abre la zona con niebla", async () => {
    await fan.goto("/juegos/expediciones");
    await expect(fan.locator('[data-testid="fragments"]')).toContainText(g.expeditions.fragments(1));
    await fan.locator('[data-testid="fog-zone"][data-zone="Ruinas"] [data-testid="unlock"]').click();
    await expect(pin(fan, "Ruinas")).toHaveAttribute("data-state", "open");
    await expect(fan.locator('[data-testid="fragments"]')).toContainText(g.expeditions.fragments(0));
  });

  await test.step("RF-25: la ficha de la carta enseña el vínculo de su personaje", async () => {
    await fan.goto(`/coleccion/${setId}`);
    await fan.locator('[data-testid="binder-grid"] li button').first().click();
    await expect(fan.locator('[data-testid="card-bond"]')).toContainText(g.sheet.bond(1));
  });

  await test.step("RF-26: las probabilidades públicas incluyen las de Expediciones", async () => {
    await fan.goto("/drop-rates");
    const odds = fan.locator('[data-testid="expedition-odds"]');
    await expect(odds).toContainText("Puerto Miel");
    await expect(odds).toContainText(/100\s%/);
  });
});
