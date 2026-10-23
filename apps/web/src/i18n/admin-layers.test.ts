// Spec 016 (RNF de idioma y de peso): los textos del editor de capas existen en los dos idiomas con la misma forma y no
// están en el diccionario general, que viaja a todas las páginas del coleccionista.
import { describe, expect, it } from "vitest";
import { adminLayersDictionaries } from "./admin-layers";
import { dictionaries } from "./index";

function shape(v: unknown, prefix = ""): string[] {
  if (typeof v === "function") return [`${prefix}()`];
  if (typeof v === "string") return [prefix];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => shape(x, prefix ? `${prefix}.${k}` : k));
  return [`${prefix}:${typeof v}`];
}

describe("spec 016 — textos del editor de capas", () => {
  it("test_s016_los_textos_del_editor_estan_en_ingles_y_espanol_con_la_misma_forma", () => {
    expect(shape(adminLayersDictionaries.es).sort()).toEqual(shape(adminLayersDictionaries.en).sort());
    expect(adminLayersDictionaries.es.title).not.toBe(adminLayersDictionaries.en.title);
  });

  it("test_s016_los_textos_del_editor_no_viajan_en_el_diccionario_general", () => {
    for (const d of Object.values(dictionaries)) expect((d.admin as Record<string, unknown>).layers).toBeUndefined();
  });
});
