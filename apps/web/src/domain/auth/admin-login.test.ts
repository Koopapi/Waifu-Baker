import { describe, expect, it } from "vitest";
import { LOCK_MS, afterFailure, canSendCode, isLocked, looksLikeCode, validPassword, validUsername } from "./admin-login";

const T0 = new Date("2026-10-29T12:00:00Z");
const ago = (ms: number) => new Date(T0.getTime() - ms);

describe("spec 024 — reglas del acceso del equipo", () => {
  it("test_s024_rf19_al_quinto_fallo_seguido_bloquea_15_minutos", () => {
    let f = 0;
    for (let i = 0; i < 4; i++) {
      const r = afterFailure(f, T0);
      expect(r.locked).toBe(false);
      f = r.failures;
    }
    const r = afterFailure(f, T0);
    expect(r.locked).toBe(true);
    expect(r.lockedUntil!.getTime() - T0.getTime()).toBe(LOCK_MS);
    expect(isLocked(r.lockedUntil, T0)).toBe(true);
    expect(isLocked(r.lockedUntil, new Date(T0.getTime() + LOCK_MS + 1))).toBe(false);
  });

  it("test_s024_rf18_como_mucho_3_reenvios_cada_10_minutos", () => {
    expect(canSendCode([], T0)).toBe(true);
    expect(canSendCode([ago(60_000), ago(120_000), ago(180_000)], T0)).toBe(true);
    expect(canSendCode([ago(60_000), ago(120_000), ago(180_000), ago(240_000)], T0)).toBe(false);
    expect(canSendCode([ago(11 * 60_000), ago(12 * 60_000), ago(13 * 60_000), ago(14 * 60_000)], T0)).toBe(true);
  });

  it("test_s024_rf14_formatos_de_usuario_contrasena_y_codigo", () => {
    expect(validUsername("koopa")).toBe(true);
    expect(validUsername("Koopa")).toBe(false);
    expect(validUsername("ab")).toBe(false);
    expect(validPassword("corta")).toBe(false);
    expect(validPassword("una-contraseña-larga")).toBe(true);
    expect(looksLikeCode("123 456")).toBe(true);
    expect(looksLikeCode("12345")).toBe(false);
  });
});
