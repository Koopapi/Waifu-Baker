// Spec 008: idiomas por defecto, paridad de diccionarios y textos sin traducir.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { translateError } from "./errors";
import { panelErrors as panelErrorsEn } from "./dictionaries/en/panel-errors";
import { panelErrors as panelErrorsEs } from "./dictionaries/es/panel-errors";
import { dictionaries } from "./index";
import { DEFAULT_LOCALE, normalizeLocale } from "./locales";

const SRC = path.resolve(__dirname, "..");

function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Forma de un diccionario: claves anidadas y si cada hoja es texto o función. */
function shape(v: unknown, prefix = ""): string[] {
  if (typeof v === "function") return [`${prefix}()`];
  if (typeof v === "string") return [prefix];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => shape(x, prefix ? `${prefix}.${k}` : k));
  return [`${prefix}:${typeof v}`];
}

/** Quita comentarios para buscar texto visible. */
function stripComments(src: string) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

describe("spec 008 — idiomas", () => {
  it("test_s008_rf1_sin_eleccion_o_con_valor_raro_se_usa_ingles", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
    expect(normalizeLocale("fr")).toBe("en");
    expect(normalizeLocale("es")).toBe("es");
  });

  it("test_s008_rf10_los_dos_diccionarios_tienen_las_mismas_claves", () => {
    expect(shape(dictionaries.es).sort()).toEqual(shape(dictionaries.en).sort());
    expect(Object.keys(panelErrorsEs).sort()).toEqual(Object.keys(panelErrorsEn).sort());
  });

  it("test_s017_rf6_los_errores_del_panel_no_pisan_codigos_del_diccionario_general", () => {
    // getDict() suma los del panel encima de los generales: un código repetido cambiaría otro mensaje.
    expect(Object.keys(panelErrorsEs).filter((k) => k in dictionaries.es.errors)).toEqual([]);
  });

  it("test_s008_rf10_cada_codigo_de_error_tiene_traduccion_en_los_dos_idiomas", () => {
    const codes = new Set<string>();
    for (const f of walk(path.join(SRC, "server")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      for (const m of readFileSync(f, "utf8").matchAll(/new (?:AdminError|AppError)\(\s*"([a-z0-9_]+)"/g)) codes.add(m[1]);
    }
    for (const f of walk(path.join(SRC, "domain")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      for (const m of readFileSync(f, "utf8").matchAll(/\bcode: "([a-z0-9_]+)"/g)) codes.add(m[1]);
    }
    expect(codes.size).toBeGreaterThan(20);
    // Los errores del panel de capas (spec 017) se traducen solo en el servidor, con su propio diccionario.
    const en = { ...dictionaries.en.errors, ...panelErrorsEn };
    const es = { ...dictionaries.es.errors, ...panelErrorsEs };
    const missing = [...codes].filter((c) => !(c in en) || !(c in es));
    expect(missing).toEqual([]);
  });

  it("test_s008_rf5_un_error_se_traduce_por_codigo_y_sin_traduccion_conserva_el_original", () => {
    expect(translateError(dictionaries.en, { code: "unknown" })).toBe(dictionaries.en.errors.unknown);
    expect(translateError(dictionaries.es, { code: "no_existe_este_codigo", message: "Original" })).toBe("Original");
  });

  it("test_s008_rf5_no_quedan_textos_en_espanol_fuera_de_los_diccionarios", () => {
    const files = [...walk(path.join(SRC, "app")), ...walk(path.join(SRC, "features"))].filter(
      (f) => /\.(tsx?|mts)$/.test(f) && !/\.test\.tsx?$/.test(f),
    );
    const offenders: string[] = [];
    for (const f of files) {
      const lines = stripComments(readFileSync(f, "utf8")).split("\n");
      lines.forEach((l, i) => {
        if (/[áéíóúñ¿¡«»]/i.test(l)) offenders.push(`${path.relative(SRC, f)}:${i + 1}: ${l.trim().slice(0, 90)}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
