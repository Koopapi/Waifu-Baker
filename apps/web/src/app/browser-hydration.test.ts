// Los navegadores y sus extensiones cambian el HTML antes de que React lo hidrate: Chrome en iPhone añade
// `__gcrremoteframetoken` a <html>, y Safari en iPhone convierte en enlaces las fechas, horas y teléfonos (con
// atributos `x-apple-data-detectors`). La web lo tolera para que no salten errores de hidratación.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const layout = readFileSync(path.resolve(__dirname, "layout.tsx"), "utf8");

describe("HTML tocado por el navegador", () => {
  it("<html> y <body> toleran atributos añadidos por el navegador", () => {
    expect(layout).toMatch(/<html[^>]*suppressHydrationWarning/);
    expect(layout).toMatch(/<body[^>]*suppressHydrationWarning/);
  });

  it("Safari no detecta fechas, teléfonos, correos ni direcciones", () => {
    expect(layout).toMatch(/formatDetection:\s*\{\s*telephone:\s*false,\s*date:\s*false,\s*email:\s*false,\s*address:\s*false\s*\}/);
  });
});
