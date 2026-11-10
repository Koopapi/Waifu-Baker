// Spec 036, RF-1 y RF-5: ningún texto de la web (inglés ni español) nombra a una persona del equipo ni a quien colabora
// en el diseño. Se revisan los archivos de los diccionarios (también las plantillas de las funciones).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Nombres de personas que no pueden salir en la web. Si alguien nuevo colabora, se añade aquí. */
const PEOPLE = ["Bruno", "Lev"];
const DICTS = path.resolve(__dirname, "dictionaries");

describe("spec 036 — textos sin nombres de personas", () => {
  it("test_s036_rf1_rf5_los_textos_de_la_web_no_nombran_personas", () => {
    const found: string[] = [];
    for (const locale of ["es", "en"]) {
      for (const file of readdirSync(path.join(DICTS, locale)).filter((f) => f.endsWith(".ts"))) {
        const lines = readFileSync(path.join(DICTS, locale, file), "utf8").split("\n");
        lines.forEach((line, i) => {
          for (const name of PEOPLE) if (new RegExp(`\\b${name}\\b`).test(line)) found.push(`${locale}/${file}:${i + 1} ${name}`);
        });
      }
    }
    expect(found).toEqual([]);
  });

  it("test_s036_rf2_el_tema_street_pop_se_describe_por_su_aspecto", () => {
    const es = readFileSync(path.join(DICTS, "es", "account.ts"), "utf8");
    const en = readFileSync(path.join(DICTS, "en", "account.ts"), "utf8");
    expect(es).toContain('street: "Claro, con bordes de tinta y sombras duras.",');
    expect(en).toContain('street: "Light, with ink outlines and hard shadows.",');
  });

  // RF-3 y RF-4: tampoco en el código, las pruebas, las specs ni los documentos (sin los paquetes de diseño originales).
  it("test_s036_rf3_rf4_el_codigo_y_los_documentos_no_nombran_personas", () => {
    const repo = path.resolve(__dirname, "../../../..");
    const roots = ["apps/web/src", "apps/web/e2e", "apps/web/tests", "apps/web/scripts", "docs", "specs"].map((r) => path.join(repo, r));
    const skip = new Set(["node_modules", "waifu-baker", ".next", "test-results"]);
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(ts|tsx|mts|mjs|js|md|css|json|html)$/.test(e.name) && full !== __filename) {
          const text = readFileSync(full, "utf8");
          for (const name of PEOPLE) if (new RegExp(`\\b${name}\\b`, "i").test(text)) found.push(`${path.relative(repo, full)} ${name}`);
        }
      }
    };
    roots.forEach(walk);
    expect(found).toEqual([]);
  });
});
