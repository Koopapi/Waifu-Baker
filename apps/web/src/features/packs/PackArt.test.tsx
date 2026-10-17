// Spec 014, RF-5, RF-7 y RF-8: el sobre de una colección.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackArt } from "./PackArt";

const base = { setId: "11111111-1111-4111-8111-111111111111", code: "FA01", name: "Fan Art · Vol. 1" };

describe("spec 014 — sobre compuesto", () => {
  it("test_s014_rf5_compone_el_sobre_con_portada_nombre_codigo_foil_y_dientes", () => {
    const html = renderToStaticMarkup(<PackArt {...base} art={{ coverVersion: "c2", packImage: null }} />);
    expect(html).toContain(`/api/sets/${base.setId}/art?k=cover&amp;v=c2`);
    expect(html).toContain("Fan Art · Vol. 1");
    expect(html).toContain("FA01");
    expect(html).toContain("pack-art__foil");
    expect((html.match(/class="pack-art__teeth/g) ?? []).length).toBe(2);
    expect(html).toContain('role="img"');
  });

  it("test_s014_rf7_con_sobre_a_mano_se_muestra_ese_y_no_el_compuesto", () => {
    const html = renderToStaticMarkup(<PackArt {...base} art={{ coverVersion: "c2", packImage: "k1" }} />);
    expect(html).toContain(`/api/sets/${base.setId}/art?k=pack&amp;v=k1`);
    expect(html).not.toContain("k=cover");
    expect(html).not.toContain("pack-art__teeth");
  });

  it("test_s014_rf5_sin_portada_el_sobre_se_compone_sin_ilustracion", () => {
    const html = renderToStaticMarkup(<PackArt {...base} art={{ coverVersion: null, packImage: null }} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("data-sticker");
  });
});
