// Rutas que se compilan antes de los tests (paso `warmup`) y tras un reinicio controlado del servidor
// (`fixtures.ts`): la primera compilación de una ruta provoca recargas completas que interrumpen
// navegaciones, sobre todo en WebKit.
export const BASE = "http://localhost:3200";
const ID = "00000000-0000-4000-8000-000000000000";

export const ROUTES = [
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
  "/recompensas",
  "/bienvenida",
  "/legal/terms",
  "/sistema",
  "/admin",
  "/admin/sets",
  `/admin/sets/${ID}`,
  `/admin/sets/${ID}/simulate`,
  "/admin/characters",
  "/admin/albumes",
  "/admin/tiers",
  "/admin/users",
  "/admin/metricas",
  "/admin/ajustes",
  `/admin/users/${ID}`,
];

/** Rutas de API que los tests llaman a mitad de una página abierta (spec 001 y siembra de datos). */
export const API_CALLS: { method: "GET" | "POST" | "DELETE"; path: string; body?: string }[] = [
  { method: "POST", path: "/api/webhooks/patreon", body: "{}" },
  { method: "DELETE", path: "/api/dev/patreon-member" },
  { method: "DELETE", path: "/api/dev/clock" },
  { method: "POST", path: "/api/dev/seed", body: "{}" },
  { method: "GET", path: `/api/album/AAAAAAAAAAAA/img?c=${ID}` },
  { method: "GET", path: "/api/cards/img" },
  { method: "GET", path: "/api/demo/card/1" },
];
