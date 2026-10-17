import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Checkbox, RadioGroup, Switch, TextArea, TextField } from "./index";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("formularios", () => {
  it("test_s011_rf4_el_campo_lleva_etiqueta_ayuda_y_error_enlazados", () => {
    const out = html(<TextField label="Alias" hint="2 a 30 caracteres" error="Ya existe" name="alias" />);
    const id = out.match(/<input[^>]*\sid="([^"]+)"/)![1];
    expect(out).toContain(`<label for="${id}"`);
    expect(out).toMatch(/aria-invalid="true"/);
    const describedBy = out.match(/aria-describedby="([^"]+)"/)![1].split(" ");
    for (const d of describedBy) expect(out).toContain(`id="${d}"`);
    expect(out).toContain("Ya existe");
    expect(out).toContain('role="alert"');
  });

  it("test_s011_rf4_sin_error_no_marca_el_campo_como_invalido", () => {
    expect(html(<TextField label="Nombre" name="n" />)).not.toContain("aria-invalid");
  });

  it("test_s011_rf4_area_de_texto_con_etiqueta", () => {
    const out = html(<TextArea label="Motivo" name="reason" />);
    expect(out).toMatch(/<textarea[^>]*name="reason"/);
    expect(out).toContain("Motivo");
  });

  it("test_s011_rf4_casilla_interruptor_y_grupo_de_opciones_accesibles", () => {
    expect(html(<Checkbox label="Acepto" name="terms" />)).toMatch(/<input[^>]*type="checkbox"/);
    expect(html(<Switch label="Álbum público" name="public" />)).toMatch(/role="switch"/);
    const radios = html(<RadioGroup label="Edad mínima" name="age" defaultValue="16" options={[{ value: "16", label: "16+" }, { value: "18", label: "18+" }]} />);
    expect(radios).toMatch(/role="radiogroup"/);
    expect((radios.match(/role="radio"/g) ?? []).length).toBe(2);
  });

  it("la casilla es nativa: responde aunque la página aún no haya cargado su JavaScript", () => {
    const out = html(<Checkbox label="Tengo la edad mínima" name="age" required defaultChecked />);
    const input = out.match(/<input[^>]*>/)![0];
    expect(input).toContain('type="checkbox"');
    expect(input).toContain('name="age"');
    expect(input).toContain("required");
    expect(input).toContain("checked");
    const id = input.match(/id="([^"]+)"/)![1];
    expect(out).toContain(`<label for="${id}"`);
    // Nada de botones que imitan una casilla: esos solo funcionan tras hidratar.
    expect(out).not.toMatch(/<button[^>]*role="checkbox"/);
  });
});
