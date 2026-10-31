import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { config, middleware } from "./middleware";

// El middleware solo corre en las rutas que no excluye `config.matcher` (misma sintaxis que una expresión regular).
const runsOn = (path: string) => config.matcher.some((m) => new RegExp(`^${m}$`).test(path));
const request = (path: string, auth?: string) =>
  new NextRequest(`https://pruebas.waifubaker.com${path}`, { headers: auth ? { authorization: `Basic ${btoa(auth)}` } : {} });

describe("contraseña del servidor de pruebas", () => {
  afterEach(() => {
    delete process.env.SITE_BASIC_AUTH;
  });

  it("test_s024_rf9_pide_la_contraseña_compartida_en_cualquier_página", () => {
    process.env.SITE_BASIC_AUTH = "equipo:secreta";
    expect(runsOn("/")).toBe(true);
    expect(runsOn("/admin")).toBe(true);
    expect(middleware(request("/")).status).toBe(401);
    expect(middleware(request("/", "equipo:otra")).status).toBe(401);
    expect(middleware(request("/", "equipo:secreta")).status).toBe(200);
  });

  it("test_s024_rf9_sin_la_variable_no_pide_contraseña", () => {
    expect(middleware(request("/")).status).toBe(200);
  });

  it("test_s001_rf15_los_avisos_de_patreon_y_la_salud_quedan_fuera_de_la_contraseña", () => {
    // Patreon no conoce la contraseña; sus avisos ya se comprueban con la firma (RF-16).
    expect(runsOn("/api/webhooks/patreon")).toBe(false);
    expect(runsOn("/api/health")).toBe(false);
    expect(runsOn("/api/webhooks/otro")).toBe(true);
    expect(runsOn("/api/auth/callback/patreon")).toBe(true);
  });
});
