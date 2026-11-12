// Spec 038, RF-1 a RF-6: los nombres nuevos de las rarezas, iguales en los dos idiomas, y sus sellos.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RARITY_SEAL } from "@/domain/catalog/rarity-tier";
import { TIER_PRESETS } from "@/domain/cards/layers-rarity";
import { dictionaries } from "./index";

const NAMES = { common: "Common", rare: "Rare", epic: "Ultra Rare", legendary: "SSR", ex: "EX" };

describe("spec 038 — nombres de las rarezas", () => {
  it("test_s038_rf1_las_rarezas_se_llaman_common_rare_ultra_rare_ssr_y_ex", () => {
    expect(dictionaries.es.common.rarity).toEqual(NAMES);
  });

  it("test_s038_rf2_los_nombres_son_iguales_en_espanol_y_en_ingles", () => {
    expect(dictionaries.en.common.rarity).toEqual(dictionaries.es.common.rarity);
  });

  it("test_s038_rf3_ningun_texto_usa_los_nombres_anteriores", () => {
    const dir = path.resolve(__dirname, "dictionaries");
    // «común» en minúscula también significa «compartido» (la biblioteca común): solo cuenta con mayúscula. Los límites
    // de palabra van con `\p{L}` porque `\b` no reconoce la «É» como letra.
    const old = /(?<!\p{L})(Común|Comunes|Rara|Raras|[Éé]picas?|[Ll]egendarias?|[Ee]pics?|[Ll]egendary|[Ll]egendaries)(?!\p{L})/u;
    const hits: string[] = [];
    for (const lang of ["es", "en"]) {
      for (const f of readdirSync(path.join(dir, lang))) {
        readFileSync(path.join(dir, lang, f), "utf8")
          .split("\n")
          .forEach((line, i) => {
            const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
            // `epic`/`legendary` como clave de objeto no son texto.
            if (old.test(code.replace(/\b(epic|legendary)\s*:/g, ""))) hits.push(`${lang}/${f}:${i + 1}`);
          });
      }
    }
    expect(hits).toEqual([]);
  });

  it("test_s038_rf4_los_grupos_se_llaman_commons_rares_ultra_rares_ssr_y_ex", () => {
    const group = { common: "Commons", rare: "Rares", epic: "Ultra Rares", legendary: "SSR", ex: "EX" };
    expect(JSON.stringify(dictionaries.es.packs)).toContain(JSON.stringify(group));
    expect(JSON.stringify(dictionaries.en.packs)).toContain(JSON.stringify(group));
  });

  it("test_s038_rf5_la_abreviatura_de_cada_rareza_es_c_r_ur_ssr_y_ex", () => {
    expect(RARITY_SEAL).toEqual({ common: "C", rare: "R", epic: "UR", legendary: "SSR", ex: "EX" });
  });

  it("test_s038_rf6_el_estilo_de_cada_rareza_pone_su_sello_nuevo", () => {
    expect(Object.values(TIER_PRESETS).map((p) => p.seal?.texto)).toEqual(["C", "R", "UR", "SSR", "EX"]);
  });
});
