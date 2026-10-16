// Compila todas las rutas del servidor de desarrollo antes de los proyectos (lista en `warm.ts`).
import { test } from "./fixtures";
import { login } from "./helpers";
import { API_CALLS, ROUTES } from "./warm";

test("calentar rutas", async ({ browser }) => {
  test.setTimeout(300_000);
  const page = await login(browser, "warmup", true);
  for (const r of ROUTES) {
    await page.goto(r);
    await page.waitForLoadState("networkidle");
  }
  // Rutas de API que los tests llaman a mitad de una página abierta.
  for (const c of API_CALLS) await page.request.fetch(c.path, { method: c.method, data: c.body });
});
