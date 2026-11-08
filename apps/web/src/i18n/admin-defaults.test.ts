// Spec 028 (RNF de idioma y de peso): los textos de los ajustes nuevos existen en los dos idiomas con la misma forma y no
// están en el diccionario general, que viaja a todas las páginas del coleccionista.
import { describe, expect, it } from "vitest";
import { adminDefaultsDictionaries } from "./admin-defaults";
import { dictionaries } from "./index";

function shape(v: unknown, prefix = ""): string[] {
  if (typeof v === "function") return [`${prefix}()`];
  if (typeof v === "string") return [prefix];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => shape(x, prefix ? `${prefix}.${k}` : k));
  return [`${prefix}:${typeof v}`];
}

describe("spec 028 — textos de los ajustes", () => {
  it("test_s028_rf15_los_textos_de_los_ajustes_estan_en_ingles_y_espanol_con_la_misma_forma", () => {
    expect(shape(adminDefaultsDictionaries.es).sort()).toEqual(shape(adminDefaultsDictionaries.en).sort());
    expect(adminDefaultsDictionaries.es.cards.heading).not.toBe(adminDefaultsDictionaries.en.cards.heading);
  });

  it("test_s028_rf15_los_textos_de_los_ajustes_no_viajan_en_el_diccionario_general", () => {
    for (const d of Object.values(dictionaries)) {
      const admin = d.admin as Record<string, unknown>;
      expect(admin.defaults).toBeUndefined();
      expect(JSON.stringify(d)).not.toContain(adminDefaultsDictionaries.es.cover.help);
    }
  });
});
