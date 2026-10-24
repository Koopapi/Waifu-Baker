// Arreglo: en el teléfono, la pista de la apertura («Toca la carta de arriba · 1 de 2») no se encima con los botones de
// abajo, aunque estos ocupen dos renglones.
import path from "node:path";
import { expect, test } from "./fixtures";
import { LAB, createPublishedSet, dismissCelebration, giftPacks, login, tear } from "./helpers";

test("apertura: la pista queda encima de los botones, sin encimarse", async ({ browser }) => {
  const project = test.info().project.name;
  test.skip(!["pixel-7", "iphone-14"].includes(project), "Solo en los teléfonos");
  const tag = project.replace(/[^a-z0-9]/g, "");
  const admin = await login(browser, `admin-pista-${tag}`, true);
  const code = `PI${tag.slice(0, 4).toUpperCase()}`;
  await createPublishedSet(admin, code, ["01.webp", "02.webp"].map((f) => path.join(LAB, f)), 2);
  await giftPacks(admin, `fan-pista-${tag}`, code, 1);
  const fan = await login(browser, `fan-pista-${tag}`, false, "/sobres");
  await fan.goto("/sobres");
  await dismissCelebration(fan);
  await fan.click(`[data-testid="group-${code}"] >> text=Abrir un sobre`);
  await tear(fan);
  await expect(fan.locator('.stage[data-phase="fanned"]')).toBeVisible();
  await expect(fan.locator(".hint")).toContainText("1 de 2");
  const hint = (await fan.locator(".hint").boundingBox())!;
  const hud = (await fan.locator(".hud").boundingBox())!;
  expect(hint.y + hint.height).toBeLessThanOrEqual(hud.y + 1);
});
