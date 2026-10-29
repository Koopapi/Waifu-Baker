import { describe, expect, it } from "vitest";
import { PHRASES } from "@/domain/expeditions/report";
import { gamesDictionaries, renderPhrase } from "./games";

describe("spec 020 — textos de Expediciones", () => {
  it("test_s020_rf24_cada_frase_del_reporte_existe_en_ingles_y_espanol", () => {
    const keys = PHRASES.map((p) => p.key).sort();
    expect(Object.keys(gamesDictionaries.en.phrases).sort()).toEqual(keys);
    expect(Object.keys(gamesDictionaries.es.phrases).sort()).toEqual(keys);
  });

  it("test_s020_rf24_cada_frase_solo_nombra_las_cartas_que_pide", () => {
    for (const p of PHRASES) {
      for (const t of Object.values(gamesDictionaries)) {
        const used = [...t.phrases[p.key].matchAll(/\{([abc])\}/g)].map((m) => "abc".indexOf(m[1]) + 1);
        expect(Math.max(0, ...used), `${p.key}`).toBeLessThanOrEqual(p.minTeam);
        expect(t.phrases[p.key]).toContain("{a}");
      }
    }
  });

  it("test_s020_rf24_la_frase_se_pinta_con_el_orden_guardado", () => {
    const t = gamesDictionaries.es;
    expect(renderPhrase(t, "g2_1", ["Yuki", "Mika"], [1, 0], "Puerto Miel")).toBe("Mika y Yuki discutieron qué camino tomar. Yuki tenía razón.");
    expect(renderPhrase(t, "city_1", ["Yuki"], [0], "Puerto Miel")).toBe("Yuki detuvo a un carterista en Puerto Miel antes de que escapara.");
  });
});
