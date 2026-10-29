import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, MIN_AGE, MIN_AGE_OPTIONS, TERMS_VERSION, isMinAge, needsAcceptance, safeNext } from "./documents";

describe("spec 007 — aceptación de términos", () => {
  it("test_s007_rf1_un_usuario_nuevo_debe_confirmar_edad_y_aceptar", () => {
    expect(MIN_AGE).toBe(16);
    expect(needsAcceptance({ ageConfirmedAt: null, termsVersion: null })).toBe(true);
    expect(needsAcceptance({ ageConfirmedAt: new Date(), termsVersion: TERMS_VERSION })).toBe(false);
  });

  it("test_s007_rf3_una_version_nueva_de_los_terminos_se_vuelve_a_pedir", () => {
    const u = { ageConfirmedAt: new Date(), termsVersion: 1 };
    expect(needsAcceptance(u, 1)).toBe(false);
    expect(needsAcceptance(u, 2)).toBe(true);
  });

  it("test_s007_rf8_cada_documento_tiene_version_y_fecha", () => {
    for (const d of Object.values(LEGAL_DOCS)) {
      expect(d.version).toBeGreaterThan(0);
      expect(d.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("test_s007_rf2_tras_aceptar_solo_se_vuelve_a_rutas_internas", () => {
    expect(safeNext("/collection")).toBe("/collection");
    expect(safeNext("https://malo.example")).toBe("/packs");
    expect(safeNext("//malo.example")).toBe("/packs");
    expect(safeNext(null)).toBe("/packs");
  });
});

describe("spec 010 — edad mínima configurable", () => {
  const ok = { ageConfirmedAt: new Date(), termsVersion: TERMS_VERSION };

  it("test_s010_rf17_solo_se_puede_elegir_16_o_18", () => {
    expect(MIN_AGE_OPTIONS).toEqual([16, 18]);
    expect(isMinAge(16)).toBe(true);
    expect(isMinAge(18)).toBe(true);
    expect(isMinAge(17)).toBe(false);
  });

  it("test_s010_rf18_al_subir_la_edad_se_vuelve_a_pedir_a_quien_confirmo_una_menor", () => {
    expect(needsAcceptance({ ...ok, ageConfirmedMin: 16 }, TERMS_VERSION, 18)).toBe(true);
    expect(needsAcceptance({ ...ok, ageConfirmedMin: 18 }, TERMS_VERSION, 18)).toBe(false);
    // Cuentas anteriores a la spec 010: confirmaron la edad de entonces, 16.
    expect(needsAcceptance({ ...ok, ageConfirmedMin: null }, TERMS_VERSION, 18)).toBe(true);
    expect(needsAcceptance({ ...ok, ageConfirmedMin: null }, TERMS_VERSION, 16)).toBe(false);
  });

  it("test_s010_rf18_bajar_la_edad_no_pide_nada", () => {
    expect(needsAcceptance({ ...ok, ageConfirmedMin: 18 }, TERMS_VERSION, 16)).toBe(false);
  });
});
