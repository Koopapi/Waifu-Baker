import { describe, expect, it } from "vitest";
import { SOUNDS as OPENING_SOUNDS } from "../opening/feedback";
import { CELEBRATION_VIBRATION, SOUNDS } from "./sounds";

describe("spec 015 — sonidos de los premios", () => {
  it("test_s015_rf12_hay_un_sonido_para_las_galletas_el_sobre_y_la_celebracion", () => {
    expect(SOUNDS).toEqual(expect.arrayContaining(["cookies", "pack", "fanfare"]));
    expect(new Set(SOUNDS).size).toBe(SOUNDS.length);
  });

  it("test_s015_rf12_la_apertura_sigue_usando_la_misma_lista", () => {
    expect(OPENING_SOUNDS).toBe(SOUNDS);
  });

  it("test_s015_rf13_la_celebracion_vibra_una_vez_y_suave", () => {
    expect(CELEBRATION_VIBRATION).toHaveLength(1);
    expect(CELEBRATION_VIBRATION[0]).toBeLessThanOrEqual(40);
  });
});
