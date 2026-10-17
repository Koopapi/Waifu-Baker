import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Spec 007, RF-18: el flujo de GitHub debe ejecutar las cuatro comprobaciones en cada cambio.
// Que pase en verde se comprueba en GitHub; aquí se vigila que nadie quite un paso por descuido.
const workflow = readFileSync(path.resolve(process.cwd(), "../../.github/workflows/ci.yml"), "utf8");

describe("integración continua", () => {
  it("test_s007_rf18_se ejecuta en cada push a main y en cada pull request", () => {
    expect(workflow).toMatch(/on:\s*\n\s+push:\s*\n\s+branches: \[main\]/);
    expect(workflow).toMatch(/^\s+pull_request:/m);
    // Solo se salta en cambios de documentación: nunca en código.
    for (const m of workflow.matchAll(/paths-ignore: \[([^\]]*)\]/g)) expect(m[1]).not.toMatch(/apps|src|\.ts/);
  });

  it("test_s007_rf18_ejecuta revisión de código, tipos, Vitest y E2E de escritorio", () => {
    const runs = [...workflow.matchAll(/^\s+run: (.+)$/gm)].map((m) => m[1].trim());
    expect(runs).toEqual(
      expect.arrayContaining([
        "pnpm lint",
        "pnpm typecheck",
        "pnpm test",
        "pnpm exec playwright test --project=chromium-desktop",
      ]),
    );
    // Ningún paso de comprobación se salta los fallos.
    expect(workflow).not.toMatch(/continue-on-error:\s*true/);
  });

  it("test_s013_rf12_la_ci_construye_la_web_y_comprueba_el_peso_de_las_paginas", () => {
    const step = workflow.slice(workflow.indexOf("name: Peso de las páginas"));
    expect(step).toMatch(/^\s+run: pnpm build && pnpm budget$/m);
    // Se mide antes de los tests largos: si una página se pasa, la CI falla pronto.
    expect(workflow.indexOf("name: Peso de las páginas")).toBeLessThan(workflow.indexOf("run: pnpm test"));
  });
});
