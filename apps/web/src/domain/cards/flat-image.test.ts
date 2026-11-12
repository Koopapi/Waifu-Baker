import { describe, expect, it } from "vitest";
import { flatImageFor } from "./flat-image";

describe("spec 037 — qué imagen fija pide cada copia", () => {
  it("test_s037_rf12_una_copia_holo_con_imagen_holo_pide_la_holo_sin_acabado_extra", () => {
    expect(flatImageFor("thumb", { holoCopy: true, holoImage: true })).toEqual({ size: "thumb-holo", holoFinish: false });
    expect(flatImageFor("mid", { holoCopy: true, holoImage: true })).toEqual({ size: "mid-holo", holoFinish: false });
  });

  it("test_s037_rf13_una_copia_normal_pide_la_normal", () => {
    expect(flatImageFor("thumb", { holoCopy: false, holoImage: true })).toEqual({ size: "thumb", holoFinish: false });
  });

  it("test_s037_rf19_rf20_una_copia_holo_sin_imagen_holo_pide_la_normal_con_su_insignia_holo", () => {
    expect(flatImageFor("thumb", { holoCopy: true, holoImage: false })).toEqual({ size: "thumb", holoFinish: true });
  });
});
