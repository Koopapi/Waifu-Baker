import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, MIN_AGE, TERMS_VERSION, needsAcceptance, safeNext } from "./documents";

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
    expect(safeNext("/coleccion")).toBe("/coleccion");
    expect(safeNext("https://malo.example")).toBe("/sobres");
    expect(safeNext("//malo.example")).toBe("/sobres");
    expect(safeNext(null)).toBe("/sobres");
  });
});
