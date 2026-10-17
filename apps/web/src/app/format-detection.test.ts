// En iPhone, Safari convierte en enlaces las fechas, horas, teléfonos y direcciones que detecta en el texto (y les
// añade atributos `x-apple-data-detectors`) antes de que React hidrate la página: el HTML ya no coincide con el
// del servidor y aparece un error de hidratación. La web desactiva esa detección en todas las páginas.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(path.resolve(__dirname, "layout.tsx"), "utf8");

describe("Safari en iPhone", () => {
  it("no detecta fechas, teléfonos, correos ni direcciones (evita errores de hidratación)", () => {
    expect(layout).toMatch(/formatDetection:\s*\{\s*telephone:\s*false,\s*date:\s*false,\s*email:\s*false,\s*address:\s*false\s*\}/);
  });
});
