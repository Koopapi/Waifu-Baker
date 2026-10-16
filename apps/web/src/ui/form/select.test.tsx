import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "./Select";

const options = [
  { value: "fa01", label: "Fan Art · Vol. 1" },
  { value: "wb01", label: "Base set" },
];

describe("desplegable", () => {
  it("test_s011_rf4_el_disparador_es_un_combobox_con_la_opcion_elegida", () => {
    const out = renderToStaticMarkup(<Select label="Colección" options={options} value="wb01" onValueChange={() => {}} />);
    expect(out).toMatch(/role="combobox"/);
    expect(out).toMatch(/aria-expanded="false"/);
    expect(out).toContain("Base set");
  });

  it("test_s011_rf4_sin_valor_muestra_el_texto_de_ayuda", () => {
    const out = renderToStaticMarkup(<Select label="Colección" options={options} placeholder="Elige una" />);
    expect(out).toContain("Elige una");
  });

  it("test_s011_rf4_con_name_se_envia_en_el_formulario", () => {
    const out = renderToStaticMarkup(<Select label="Colección" name="setId" options={options} defaultValue="fa01" />);
    expect(out).toMatch(/<input[^>]*type="hidden"[^>]*name="setId"[^>]*value="fa01"|<input[^>]*name="setId"[^>]*type="hidden"[^>]*value="fa01"/);
  });
});
