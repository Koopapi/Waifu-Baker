// Spec 025, RF-21 a RF-26: los componentes del configurador de cartas (deslizador, fichas, selector y color).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LayerList, LayerRow } from "../content/LayerList";
import { PreviewStage } from "../game/PreviewStage";
import { ChipGroup, ColorField, Segmented, Slider } from "./index";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const noop = () => {};

describe("spec 025 — componentes del configurador", () => {
  it("test_s025_rf22_el_deslizador_tiene_etiqueta_y_valor_con_unidad", () => {
    const out = html(<Slider label="Profundidad del parallax" value={14} min={0} max={30} unit=" px" onValueChange={noop} data-testid="s" />);
    const id = out.match(/<input[^>]*\sid="([^"]+)"/)![1];
    expect(out).toContain(`<label for="${id}"`);
    expect(out).toMatch(/<input[^>]*type="range"/);
    expect(out).toContain('aria-valuetext="14 px"');
    expect(out).toContain(">14 px</output>");
    // El relleno sigue al valor (14 de 0 a 30).
    expect(out).toMatch(/--fill:46\.6\d*%/);
  });

  it("test_s025_rf22_el_deslizador_acepta_un_formato_propio", () => {
    expect(html(<Slider label="Opacidad" value={0.75} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onValueChange={noop} />)).toContain(">75 %</output>");
  });

  it("test_s025_rf25_fichas_con_muestra_y_selector_de_opciones_juntas_son_grupos_de_radio", () => {
    const chips = html(<ChipGroup label="Rareza" value="ssr" options={[{ value: "ssr", label: "LEG", swatch: "linear-gradient(red,blue)" }, { value: "ninguno", label: "Sin marco" }]} />);
    expect(chips).toMatch(/role="radiogroup"/);
    expect((chips.match(/role="radio"/g) ?? []).length).toBe(2);
    expect(chips).toContain("background:linear-gradient(red,blue)");
    const seg = html(<Segmented label="Sello" value="text" options={[{ value: "none", label: "Ninguno" }, { value: "text", label: "Texto" }, { value: "image", label: "Imagen" }]} />);
    expect((seg.match(/role="radio"/g) ?? []).length).toBe(3);
    expect(seg).toMatch(/aria-checked="true"[^>]*>Texto/);
  });

  it("test_s025_el_campo_de_color_muestra_su_valor_hexadecimal", () => {
    const out = html(<ColorField label="Color" value="#6d5cff" onValueChange={noop} />);
    expect(out).toMatch(/<input[^>]*type="color"[^>]*value="#6d5cff"/);
    expect(out).toContain("#6d5cff</span>");
  });

  it("test_s025_rf23_rf24_la_fila_de_capa_se_abre_y_sus_botones_quedan_fuera_del_que_la_abre", () => {
    const closed = html(
      <LayerList frontLabel="Adelante" backLabel="Atrás">
        <LayerRow thumb={null} title="Chica" subtitle="Normal · prof 1.00" open={false} onOpenChange={noop} actions={<button type="button">Quitar</button>}>
          <p>ajustes</p>
        </LayerRow>
      </LayerList>,
    );
    expect(closed.indexOf("Adelante")).toBeLessThan(closed.indexOf("Chica"));
    expect(closed.indexOf("Chica")).toBeLessThan(closed.indexOf("Atrás"));
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).not.toContain("ajustes");
    expect(closed).not.toMatch(/<button[^>]*aria-expanded[^]*?<button[^>]*>Quitar<\/button>[^]*?<\/button>/);
    const open = html(<LayerRow thumb={null} title="Chica" open onOpenChange={noop}><p>ajustes</p></LayerRow>);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain("ajustes");
    expect(open).toContain("data-open");
  });

  it("test_s025_rf21_la_escena_de_la_vista_previa_lleva_su_texto_de_ayuda", () => {
    const out = html(<PreviewStage hint="Pasa el cursor por aquí" aria-label="Vista previa"><span>carta</span></PreviewStage>);
    expect(out).toContain('aria-label="Vista previa"');
    expect(out).toContain("Pasa el cursor por aquí");
  });
});
