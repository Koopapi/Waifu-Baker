// Criterios de finalización de la spec 004: regalar sobres → abrir uno con la animación → reanudar
// tras recargar → «Abrir todos» → la colección refleja las cartas y las repetidas suman.
import { expect, test } from "./fixtures";
import path from "node:path";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login, tear, openAllAndSkip } from "./helpers";

test("coleccionista: de sobres regalados a colección", async ({ browser }) => {
  await test.step("RF-2: sin sesión, «Mis sobres» lleva al login y vuelve", async () => {
    const anon = await (await browser.newContext()).newPage();
    await anon.goto("/sobres");
    await expect(anon).toHaveURL(/\/login\?next=%2Fsobres/);
    await anon.context().close();
  });

  const fan = await login(browser, "coleccionista-e2e", false, "/sobres");
  await expect(fan).toHaveURL(/\/sobres$/);
  await expect(fan.locator("text=No tienes sobres sin abrir.")).toBeVisible();

  const admin = await login(browser, "admin-e2e-2", true);
  await createPublishedSet(admin, "COL1", ["01.webp", "02.webp", "03.webp"].map((f) => path.join(LAB, f)), 3);
  await giftPacks(admin, "coleccionista-e2e", "COL1", 4);

  await test.step("RF-1: «Mis sobres» muestra los sobres por colección", async () => {
    await fan.goto("/sobres");
    await dismissCelebration(fan);
    await expect(fan.locator('[data-testid="group-COL1"]')).toContainText("x4");
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}-1-mis-sobres.png` });
  });

  let firstImage = "";
  await test.step("RF-16, RF-11 y RF-20: abrir un sobre con la animación y las cartas reales", async () => {
    await fan.click('[data-testid="group-COL1"] >> text=Abrir un sobre');
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="fanned"]')).toBeVisible();
    const img = fan.locator(".card3d img").first();
    firstImage = (await img.getAttribute("src"))!;
    expect(firstImage).toMatch(/^\/api\/cards\/img\?c=.+&s=mid&e=\d+&sig=[0-9a-f]{64}$/);
    // Spec 018: la imagen fija de la carta por capas (700 × 991).
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(700);
    await fan.locator('.card3d[role="button"]').first().click();
    await expect(fan.locator('.stage[data-revealed="1"]')).toBeVisible();
    await fan.locator('.card3d[role="button"]').first().click();
    await expect(fan.locator(".summary")).toBeVisible();
    await expect(fan.locator(".summary__row")).toHaveCount(2);
    await expect(fan.locator(".summary__row").first()).toContainText("¡Nueva!");
    await expect(fan.locator('[data-testid="open-another"]')).toHaveText("Abrir otro (3)");
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}-2-resumen.png` });
  });

  await test.step("RF-20: el enlace de imagen no sirve con la sesión de otra persona", async () => {
    const res = await admin.request.get(firstImage);
    expect(res.status()).toBe(404);
  });

  await test.step("RF-17: recargar a mitad de una apertura la recupera sin abrir otro sobre", async () => {
    await fan.click('[data-testid="open-another"]');
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="fanned"]')).toBeVisible();
    await fan.goto("/sobres");
    await expect(fan.locator('[data-testid="group-COL1"]')).toContainText("x2");
    await fan.click('[data-testid="pending-opening"]');
    // En WebKit, la navegación del enlace puede seguir en curso: se espera a que termine antes de seguir.
    await fan.waitForURL(/\?pack=/);
    await fan.waitForLoadState("networkidle");
    await tear(fan);
    await expect(fan.locator('.stage[data-phase="fanned"]')).toBeVisible();
    // Al llegar al resumen se marca la apertura como vista (acción en segundo plano): se espera su respuesta antes de
    // salir, o WebKit la corta al navegar y la apertura sigue pendiente.
    const acked = fan.waitForResponse((r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]));
    for (let k = 0; k < 2; k++) {
      await fan.locator('.card3d[role="button"]').first().click();
      await expect(fan.locator(`.stage[data-revealed="${k + 1}"]`)).toBeVisible();
    }
    await expect(fan.locator(".summary")).toBeVisible();
    await acked;
    await fan.goto("/sobres");
    await expect(fan.locator('[data-testid="pending-opening"]')).toHaveCount(0);
    await expect(fan.locator('[data-testid="group-COL1"]')).toContainText("x2");
  });

  await test.step("RF-18: «Abrir todos» abre el resto y muestra todas las cartas", async () => {
    await fan.click('[data-testid="group-COL1"] >> text=Abrir todos (2)');
    // Spec 019: tras la animación (saltada), el resumen con sus totales y la rareza más alta primero.
    expect(await openAllAndSkip(fan)).toBe(4);
    await expect(fan.locator('[data-testid="open-all-result"] h2')).toHaveText("Abriste 2 sobres");
    await expect(fan.locator('[data-testid="open-all-result"] h3').first()).toContainText("Raras");
    await fan.waitForTimeout(800);
    await fan.screenshot({ path: `test-results/screens/${test.info().project.name}-3-abrir-todos.png`, fullPage: true });
    await fan.goto("/sobres");
    await expect(fan.locator("text=No tienes sobres sin abrir.")).toBeVisible();
  });

  await test.step("RF-10: la colección refleja las 8 cartas y las repetidas suman", async () => {
    await admin.goto("/admin/users?q=coleccionista-e2e");
    await admin.click("a:text-is('coleccionista-e2e')");
    await admin.waitForURL(/\/admin\/users\/[0-9a-f-]+$/);
    await expect(admin.locator("h2", { hasText: "Colección" })).toContainText("8 en total");
    const items = admin.locator("section:has(h2:has-text('Colección')) li");
    const texts = await items.allInnerTexts();
    const total = texts.reduce((a, t) => a + Number(t.match(/x(\d+)$/)?.[1] ?? 0), 0);
    expect(total).toBe(8);
    expect(texts.some((t) => /x[2-9]$/.test(t))).toBe(true);
  });
});

test("teclado: abrir un sobre y voltear las cartas sin ratón", async ({ browser }) => {
  test.skip(test.info().project.name !== "chromium-desktop", "solo en escritorio");
  const fan = await login(browser, "teclado-e2e", false, "/sobres");
  const admin = await login(browser, "admin-teclado", true);
  await createPublishedSet(admin, "KEY1", ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);
  await giftPacks(admin, "teclado-e2e", "KEY1", 1);
  await fan.goto("/sobres");
  await dismissCelebration(fan);
  await fan.click('[data-testid="group-KEY1"] >> text=Abrir un sobre');
  await fan.waitForLoadState("networkidle");
  await fan.locator(".pack__strip").focus();
  await fan.keyboard.press("Enter");
  await expect(fan.locator('.stage[data-phase="fanned"]')).toBeVisible();
  await expect(fan.locator('.card3d[role="button"]')).toBeFocused();
  await fan.keyboard.press("Enter");
  await expect(fan.locator('.stage[data-revealed="1"]')).toBeVisible();
  await expect(fan.locator('.card3d[role="button"]')).toBeFocused();
  await fan.keyboard.press(" ");
  await expect(fan.locator(".summary")).toBeVisible();
});
