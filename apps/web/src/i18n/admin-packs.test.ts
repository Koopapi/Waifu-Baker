// Spec 030 (RNF de idioma y de peso): los textos del editor de sobres existen en los dos idiomas con la misma forma y no
// están en el diccionario general, que viaja a todas las páginas del coleccionista.
import { describe, expect, it } from "vitest";
import { adminPacksDictionaries } from "./admin-packs";
import { dictionaries } from "./index";

function shape(v: unknown, prefix = ""): string[] {
  if (typeof v === "function") return [`${prefix}()`];
  if (typeof v === "string") return [prefix];
  if (Array.isArray(v)) return v.flatMap((x, i) => shape(x, `${prefix}[${i}]`));
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => shape(x, prefix ? `${prefix}.${k}` : k));
  return [`${prefix}:${typeof v}`];
}

describe("spec 030 — textos del editor de sobres", () => {
  it("test_s030_rnf_los_textos_del_editor_estan_en_ingles_y_espanol_con_la_misma_forma", () => {
    expect(shape(adminPacksDictionaries.es).sort()).toEqual(shape(adminPacksDictionaries.en).sort());
    expect(adminPacksDictionaries.es.title).toBe("Creador de sobres");
    expect(adminPacksDictionaries.en.title).toBe("Pack creator");
  });

  it("test_s030_rnf_los_textos_del_editor_no_viajan_en_el_diccionario_general", () => {
    for (const d of Object.values(dictionaries)) expect(JSON.stringify(d)).not.toContain(adminPacksDictionaries.es.dropHint);
  });

  it("test_s030_rnf_los_textos_del_sobre_en_el_juego_estan_en_los_dos_idiomas", () => {
    expect(dictionaries.es.packs.sobre.tear.hint).toBe("Desliza el dedo por la línea");
    expect(dictionaries.en.packs.sobre.tear.hint).not.toBe(dictionaries.es.packs.sobre.tear.hint);
  });
});
