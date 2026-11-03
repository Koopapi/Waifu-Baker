import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SaveStatus } from "./SaveStatus";

describe("spec 027 — estado de guardado", () => {
  it("test_s027_rf4_el_estado_se_ve_siempre_y_se_anuncia_a_los_lectores_de_pantalla", () => {
    const out = renderToStaticMarkup(<SaveStatus state="dirty" label="Cambios sin guardar" />);
    expect(out).toMatch(/role="status"/);
    expect(out).toMatch(/aria-live="polite"/);
    expect(out).toMatch(/data-state="dirty"/);
    expect(out).toContain("Cambios sin guardar");
    // Cada estado tiene su color (por variables del sistema, nunca sueltos).
    for (const state of ["clean", "saving", "saved", "conflict", "no-storage"] as const) {
      expect(renderToStaticMarkup(<SaveStatus state={state} label={state} />)).toMatch(new RegExp(`data-state="${state}"`));
    }
    const saved = renderToStaticMarkup(<SaveStatus state="saved" label="Guardado a las 14:05" detail="Sin borrador en este navegador" />);
    expect(saved).toContain("Guardado a las 14:05");
    expect(saved).toContain("Sin borrador en este navegador");
    expect(saved).toMatch(/bg-ui-success/);
  });
});
