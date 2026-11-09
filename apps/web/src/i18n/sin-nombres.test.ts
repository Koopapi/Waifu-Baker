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
});
