import { describe, expect, it } from "vitest";
import { buttonClasses, iconButtonClasses } from "./classes";

describe("botones", () => {
  it("test_s011_rf3_cinco_variantes_con_su_color_de_token", () => {
    expect(buttonClasses()).toContain("bg-ui-accent");
    expect(buttonClasses({ variant: "secondary" })).toContain("bg-ui-raised");
    expect(buttonClasses({ variant: "danger" })).toContain("bg-ui-danger");
    expect(buttonClasses({ variant: "success" })).toContain("bg-ui-success");
    expect(buttonClasses({ variant: "ghost" })).toContain("text-ui-text-2");
  });

  it("test_s011_rf3_tres_tamanos_y_ancho_completo", () => {
    expect(buttonClasses({ size: "sm" })).toContain("h-8");
    expect(buttonClasses()).toContain("h-10");
    expect(buttonClasses({ size: "lg" })).toContain("h-12");
    expect(buttonClasses({ width: "full" })).toContain("w-full");
  });

  it("test_s011_rf3_estados_de_pulsado_foco_y_deshabilitado", () => {
    const c = buttonClasses();
    expect(c).toContain("active:scale-[0.97]");
    expect(c).toContain("focus-visible:outline-2");
    expect(c).toContain("disabled:opacity-50");
  });

  it("test_s011_rf3_el_boton_de_icono_es_cuadrado_en_cada_tamano", () => {
    expect(iconButtonClasses({ size: "sm" })).toContain("size-8");
    expect(iconButtonClasses()).toContain("size-9");
    expect(iconButtonClasses({ size: "lg" })).toContain("size-11");
  });
});
