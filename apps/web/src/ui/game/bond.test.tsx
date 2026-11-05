// Spec 029: componentes de la barra de vínculo, la línea de personaje y el resumen de lo que se gana.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BondBar } from "./BondBar";
import { CardLine } from "../content/CardLine";
import { GainSummary } from "../feedback/GainSummary";

describe("spec 029 — componentes", () => {
  it("test_s029_rf15_la_barra_de_vinculo_dice_nivel_titulo_puntos_y_lo_siguiente", () => {
    const out = renderToStaticMarkup(<BondBar label="Bond with Aiko" levelLabel="Level 3" title="Friend" pointsLabel="160 / 300 points" value={10} max={150} hint="Level 5: holo" />);
    expect(out).toContain("Level 3");
    expect(out).toContain("Friend");
    expect(out).toContain("160 / 300 points");
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-label="Bond with Aiko"');
    expect(out).toContain("Level 5: holo");
  });

  it("test_s029_rf15_la_linea_muestra_las_que_tiene_y_el_hueco_de_las_que_faltan", () => {
    const out = renderToStaticMarkup(
      <CardLine label="Line" items={[{ key: "a", label: "001", image: "/a.webp", owned: true, missingLabel: "Missing" }, { key: "b", label: "002", owned: false, missingLabel: "Missing" }]} />,
    );
    expect(out).toContain('data-owned="true"');
    expect(out).toContain('data-owned="false"');
    expect(out).toContain('src="/a.webp"');
    expect(out.match(/Missing/g)).toHaveLength(1);
  });

  it("test_s029_rf4_el_resumen_lista_lo_que_se_gana", () => {
    const out = renderToStaticMarkup(<GainSummary rows={[{ label: "Points", value: "75" }, { label: "Dust", value: "22" }]} />);
    expect(out).toContain("<dt");
    expect(out).toContain("75");
    expect(out).toContain("Dust");
  });
});
