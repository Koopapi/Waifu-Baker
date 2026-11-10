// Spec 033: fichas de varias opciones para los filtros.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToggleChips } from "./ToggleChips";

describe("spec 033 — fichas de varias opciones", () => {
  it("test_s033_rf4_cada_ficha_es_un_boton_con_su_estado_y_su_numero", () => {
    const out = renderToStaticMarkup(
      <ToggleChips label="Rareza" value={["rare"]} onValueChange={() => {}} options={[{ value: "common", label: "Común", count: 12 }, { value: "rare", label: "Rara", count: 3 }]} />,
    );
    const group = out.match(/role="group" aria-labelledby="([^"]+)"/);
    expect(group).not.toBeNull();
    expect(out).toContain(`id="${group![1]}"`);
    expect(out).toMatch(/aria-pressed="false" data-value="common"[^>]*>Común<span[^>]*>12<\/span>/);
    expect(out).toMatch(/aria-pressed="true" data-value="rare"/);
  });
});
