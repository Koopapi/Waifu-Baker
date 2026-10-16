// Compila todas las rutas del servidor de desarrollo antes de los proyectos: la primera
// compilación provoca recargas completas que interrumpen navegaciones (sobre todo en WebKit).
import { test } from "./fixtures";
import { login } from "./helpers";

const ID = "00000000-0000-4000-8000-000000000000";
const ROUTES = [
  "/",
  "/login",
  "/drop-rates",
  "/no-existe",
  "/album/AAAAAAAAAAAA",
  "/sobres",
  `/sobres/${ID}`,
  `/sobres/${ID}/todos`,
  "/coleccion",
  `/coleccion/${ID}`,
  "/coleccion/album",
  "/cuenta",
  "/admin",
  "/admin/sets",
  `/admin/sets/${ID}`,
  `/admin/sets/${ID}/simulate`,
  "/admin/characters",
  "/admin/tiers",
  "/admin/users",
  `/admin/users/${ID}`,
];

test("calentar rutas", async ({ browser }) => {
  test.setTimeout(300_000);
  const page = await login(browser, "warmup", true);
  for (const r of ROUTES) {
    await page.goto(r);
    await page.waitForLoadState("networkidle");
  }
  // Rutas de API que los tests llaman a mitad de una página abierta (spec 001).
  await page.request.post("/api/webhooks/patreon", { data: "{}" });
  await page.request.delete("/api/dev/patreon-member");
  await page.request.get(`/api/album/AAAAAAAAAAAA/img?c=${ID}`);
  await page.request.get("/api/cards/img");
});
