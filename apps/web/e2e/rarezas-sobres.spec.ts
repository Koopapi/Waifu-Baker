// Criterios de finalización de la spec 022: el panel muestra la tabla plata y la gold en pestañas y simula un sobre gold
// → el administrador regala un sobre gold → «Mis sobres» separa plata y gold con su etiqueta → la apertura y «Abrir
// todos» dicen el tipo y el gold trae lo de su tabla → Probabilidades publica las dos tablas → la común se ve plana y la
// legendaria viva con su sello.
import path from "node:path";
import { dictionaries } from "../src/i18n/index";
import { expect, test } from "./fixtures";
import { choose, createPublishedSet, dismissCelebration, giftPacks, LAB, login, openAllAndSkip, openDeck, tear } from "./helpers";

const es = dictionaries.es;

test("rarezas y sobres plata y gold", async ({ browser }) => {
  const reduced = test.info().project.name === "reduced-motion";
  const tag = test.info().project.name.replace(/[^a-z0-9]/g, "");
  const code = `RS${tag.slice(0, 4).toUpperCase()}`;
  const fanName = `fan-rs-${tag}`;
  const fan = await login(browser, fanName, false, "/sobres");
  const admin = await login(browser, `admin-rs-${tag}`, true);
  // 001 y 002 comunes, 003 rara; el ayudante añade la 004, legendaria, que solo sale en los gold (tabla gold: todo legendaria).
  const setId = await createPublishedSet(admin, code, ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await giftPacks(admin, fanName, code, 2);

  await test.step("RF-21: el panel muestra las dos tablas en pestañas y simula un sobre gold", async () => {
    await admin.goto(`/admin/sets/${setId}`);
    await expect(admin.locator('[data-testid="odds-silver"]')).toBeVisible();
    await admin.getByRole("tab", { name: es.common.packKind.gold }).click();
    const gold = admin.locator('[data-testid="odds-gold"]');
    await expect(gold).toBeVisible();
    await expect(gold.locator(`[aria-label="${es.admin.odds.slotAria(2, es.common.rarity.legendary)}"]`)).toHaveValue("100");
    // Publicada: sin protección de mala suerte en el gold y bloqueada.
    await expect(gold.getByLabel(es.admin.odds.pityAria)).toHaveCount(0);
    await admin.click('[data-testid="simulate-gold-link"]');
    await admin.waitForURL(/simulate\?k=gold$/);
    // Spec 023: el simulador usa el mismo sobre, con su foil gold.
    await expect(admin.locator('[data-testid="tear-pack"] .pack-shell[data-kind="gold"]')).toBeVisible();
    await tear(admin);
    await openDeck(admin);
    await expect(admin.locator(".summary__row")).toHaveCount(2);
    for (const row of await admin.locator(".summary__row").all()) await expect(row).toContainText(`${code} carta gold`);
  });

  await test.step("RF-22: el administrador regala un sobre gold", async () => {
    await admin.goto(`/admin/users?q=${fanName}`);
    await admin.click(`a:text-is('${fanName}')`);
    await choose(admin, es.admin.users.giftSet, `${code} · Colección ${code}`);
    await choose(admin, es.admin.users.giftKind, es.common.packKind.gold);
    await admin.fill('form:has(input[name="setId"]) input[name="reason"]', "Sobre gold del test E2E");
    await admin.click(`button:has-text('${es.admin.users.gift}')`);
    await expect(admin.locator("text=1 sobre regalado.")).toBeVisible();
  });

  await test.step("RF-19: «Mis sobres» separa plata y gold, cada uno con su etiqueta", async () => {
    await fan.goto("/sobres");
    await dismissCelebration(fan);
    const silver = fan.locator(`[data-testid="group-${code}"]`);
    const gold = fan.locator(`[data-testid="group-${code}-gold"]`);
    await expect(silver.locator('[data-testid="pack-kind"]')).toHaveText(es.common.packKind.silver);
    await expect(silver).toContainText("x2");
    await expect(gold.locator('[data-testid="pack-kind"]')).toHaveText(es.common.packKind.gold);
    await expect(gold).toContainText("x1");
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}-s022-mis-sobres.png`, fullPage: true });
  });

  await test.step("RF-12 y RF-19: la apertura de un gold dice GOLD y trae lo de la tabla gold", async () => {
    await fan.click(`[data-testid="group-${code}-gold"] >> text=${es.packs.mine.openOne}`);
    await fan.waitForURL(/\?k=gold$/);
    await expect(fan.locator('[data-testid="pack-kind"][data-kind="gold"]')).toBeVisible();
    await tear(fan);
    await openDeck(fan);
    for (const row of await fan.locator(".summary__row").all()) await expect(row).toContainText(`${code} carta gold`);
  });

  await test.step("RF-19: «Abrir todos» de los plata dice PLATA", async () => {
    await fan.goto("/sobres");
    await fan.click(`[data-testid="group-${code}"] >> text=${es.packs.mine.openAll(2)}`);
    await fan.waitForURL(new RegExp(`/sobres/${setId}/todos$`));
    await expect(fan.locator('h1 [data-testid="pack-kind"]')).toHaveText(es.common.packKind.silver);
    expect(await openAllAndSkip(fan)).toBe(4);
  });

  await test.step("RF-20: Probabilidades publica la tabla plata y la gold", async () => {
    await fan.goto("/drop-rates");
    await expect(fan.locator(`[data-testid="odds-${code}-silver"] tr`)).toHaveCount(2);
    const gold = fan.locator(`[data-testid="odds-${code}-gold"] tr`);
    await expect(gold).toHaveCount(2);
    await expect(gold.nth(1)).toContainText("100");
    await expect(fan.locator(`[data-testid="published-${code}-gold"]`)).toContainText(es.site.dropRates.guarantee.gold);
    await expect(fan.locator(`[data-testid="published-${code}-silver"]`)).toContainText(es.site.dropRates.guarantee.silver);
  });

  await test.step("RF-4 a RF-9: la común se ve plana y la legendaria viva con su sello", async () => {
    await fan.goto(`/coleccion/${setId}`);
    const art = fan.locator('[data-testid="card-sheet-art"]');
    // La común que haya salido (la 001 o la 002).
    const common = fan.locator('[aria-label="Ver carta 001"], [aria-label="Ver carta 002"]').first();
    await common.click();
    await expect(art.locator('[data-testid="card-sheet-flat"]')).toBeVisible();
    await expect(art.locator(".cc-card")).toHaveCount(0);
    await fan.keyboard.press("Escape");
    await fan.click('[aria-label="Ver carta 004"]');
    if (reduced) {
      await expect(art.locator('[data-testid="card-sheet-flat"]')).toBeVisible();
      return;
    }
    await expect(art.locator(".cc-card")).toBeVisible();
    await expect(art.locator(".cc-sello")).toHaveText("LEG");
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}-s022-legendaria.png` });
  });
});
