import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Spec 007, RF-18: el flujo de GitHub debe ejecutar las cuatro comprobaciones en cada cambio.
// Que pase en verde se comprueba en GitHub; aquí se vigila que nadie quite un paso por descuido.
const workflow = readFileSync(path.resolve(process.cwd(), "../../.github/workflows/ci.yml"), "utf8");

describe("integración continua", () => {
  it("test_s007_rf18_se ejecuta en cada push a main y en cada pull request", () => {
    expect(workflow).toMatch(/on:\s*\n\s+push:\s*\n\s+branches: \[main\]\s*\n\s+pull_request:/);
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
});
