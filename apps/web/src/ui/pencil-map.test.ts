// Spec 011, RF-16: cada componente del sistema tiene su versión en Pencil (tabla en docs/DESIGN.md).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as ui from "./index";

const design = readFileSync(path.resolve(__dirname, "../../../../docs/DESIGN.md"), "utf8");
const table = design.slice(design.indexOf("## Sistema de diseño (spec 011)"));
const mapped = new Set([...table.matchAll(/^\| (\w+) \|/gm)].map((m) => m[1]));

describe("sistema de diseño en Pencil", () => {
  it("test_s011_rf16_cada_componente_del_codigo_tiene_su_componente_en_pencil", () => {
    // Componentes de React exportados por el sistema (empiezan por mayúscula y no son tipos).
    const components = Object.entries(ui)
      .filter(([name, v]) => /^[A-Z]/.test(name) && (typeof v === "function" || (typeof v === "object" && v !== null && "$$typeof" in v)))
      .map(([name]) => name);
    expect(components.length).toBeGreaterThan(20);
    expect(components.filter((c) => !mapped.has(c))).toEqual([]);
  });
});
