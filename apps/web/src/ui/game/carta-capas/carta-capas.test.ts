// La configuración de una carta por capas puede venir de la base de datos: lo que el script mete en `style` o en
// atributos solo puede ser de una lista cerrada (si no, una config manipulada inyectaría HTML o CSS).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import lib from "./carta-capas.js";
import type { CartaCapasApi } from "./carta-capas";

const api = lib as unknown as CartaCapasApi;
const src = readFileSync(path.resolve(__dirname, "carta-capas.js"), "utf8");

describe("carta por capas — valores seguros", () => {
  it("solo acepta modos de mezcla conocidos", () => {
    expect(api.seguro.mezcla("screen")).toBe("screen");
    expect(api.seguro.mezcla('screen;" onmouseover="alert(1)')).toBe("normal");
    expect(api.seguro.mezcla(undefined)).toBe("normal");
  });

  it("solo acepta las cuatro esquinas del sello", () => {
    expect(api.seguro.esquina("inf-der")).toBe("inf-der");
    expect(api.seguro.esquina('x"><img src=x onerror=alert(1)>')).toBe("sup-izq");
  });

  it("solo acepta colores hexadecimales", () => {
    expect(api.seguro.color("#ff7eb6")).toBe("#ff7eb6");
    expect(api.seguro.color("red;background:url(https://evil)")).toBeNull();
    expect(api.seguro.color(42)).toBeNull();
  });

  it("el script ya no mete la mezcla, la esquina ni el color sin pasar por la lista", () => {
    expect(src).not.toMatch(/'mix-blend-mode:' \+ c\.mezcla/);
    expect(src).not.toMatch(/var esq = s\.esquina/);
    expect(src).not.toMatch(/c\.color \? \[c\.color\]/);
  });
});

describe("spec 017 — encuadre de cada capa", () => {
  it("test_s017_rf12_el_encuadre_es_un_transform_de_la_imagen", () => {
    expect(api.seguro.encuadre({ x: 10, y: -5, escala: 1.5, giro: 12 })).toBe("transform:translate(10%,-5%) scale(1.5) rotate(12deg);");
    // Lo que no trae toma el valor por defecto; el ajuste «contener» dibuja la imagen entera.
    expect(api.seguro.encuadre({ escala: 0.5, ajuste: "contener" })).toBe("transform:translate(0%,0%) scale(0.5) rotate(0deg);object-fit:contain;");
    expect(api.seguro.encuadre({ ajuste: "contener" })).toBe("object-fit:contain;");
  });

  it("test_s017_rf12_sin_encuadre_la_capa_se_dibuja_como_antes", () => {
    expect(api.seguro.encuadre(undefined)).toBe("");
    expect(api.seguro.encuadre({ x: 0, y: 0, escala: 1, giro: 0, ajuste: "cubrir" })).toBe("");
  });

  it("test_s017_rf11_valores_fuera_de_rango_o_no_numericos_se_acotan", () => {
    expect(api.seguro.encuadre({ x: 500, escala: 99, giro: -900 })).toBe("transform:translate(100%,0%) scale(4) rotate(-180deg);");
    expect(api.seguro.encuadre({ x: '1%;background:url(x)', escala: "a" })).toBe("");
    expect(api.seguro.encuadre({ ajuste: "fill;color:red" })).toBe("");
  });

  it("test_s017_rf12_el_encuadre_va_en_la_imagen_y_el_parallax_en_la_capa", () => {
    // La capa (.cc-capa) recibe el translate3d del parallax; el encuadre va en su <img>, así no se pisan.
    expect(src).toMatch(/draggable="false" style="' \+ encuadreEstilo\(c\.encuadre\)/);
    expect(src).toMatch(/capas\[i\]\.style\.transform = 'translate3d\(/);
  });
});

describe("spec 018 — giroscopio", () => {
  it("test_s018_rf12_el_giroscopio_se_puede_activar_y_apagar", () => {
    expect(src).toMatch(/habilitarGiroscopio: function/);
    expect(src).toMatch(/deshabilitarGiroscopio: function \(\) \{\s*global\.removeEventListener\('deviceorientation', onOri\);/);
  });
});
