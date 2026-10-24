// Arreglo (pedido del dueño, 19 oct 2026): la página de Probabilidades se cierra con su propio botón, sin depender del
// botón «atrás» del navegador.
import { desktopOnly, expect, test } from "./fixtures";
import { BASE } from "./warm";

test("probabilidades: el botón Cerrar vuelve a donde estaba o a la portada", async ({ browser }) => {
  desktopOnly();
  const page = await (await browser.newContext()).newPage();

  await test.step("Desde otra página de la web, vuelve a ella", async () => {
    await page.goto("/login");
    await page.goto("/drop-rates", { referer: `${BASE}/login` });
    await page.click('[data-testid="page-close"]');
    await expect(page).toHaveURL(/\/login$/);
  });

  await test.step("Si se entró directo, lleva a la portada", async () => {
    const direct = await (await browser.newContext()).newPage();
    await direct.goto("/drop-rates");
    await direct.click('[data-testid="page-close"]');
    await expect(direct).toHaveURL(`${BASE}/`);
  });
});
