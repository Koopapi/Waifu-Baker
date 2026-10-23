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
