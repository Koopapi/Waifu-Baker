// Compila todas las rutas del servidor de desarrollo antes de los proyectos (lista en `warm.ts`).
import { test } from "./fixtures";
import { login } from "./helpers";
import { API_CALLS, ROUTES } from "./warm";

test("calentar rutas", async ({ browser }) => {
  // Compilar todas las rutas en modo desarrollo tarda más en máquinas lentas o cargadas (WSL, otra app en marcha):
  // 10 minutos por defecto y ajustable con E2E_WARMUP_TIMEOUT_MS.
  test.setTimeout(Number(process.env.E2E_WARMUP_TIMEOUT_MS) || 600_000);
  const page = await login(browser, "warmup", true);
  for (const r of ROUTES) {
    await page.goto(r);
    await page.waitForLoadState("networkidle");
  }
  // Rutas de API que los tests llaman a mitad de una página abierta.
  for (const c of API_CALLS) await page.request.fetch(c.path, { method: c.method, data: c.body });
});
