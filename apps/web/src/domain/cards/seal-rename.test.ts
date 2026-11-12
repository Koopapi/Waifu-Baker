import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { renameSeal } from "./seal-rename";

const conf = (sello: LayersConfig["sello"]): LayersConfig => ({ capas: [{ key: "sets/s/layers/a.webp", rol: "personaje" }], marco: "sr", sello });

describe("spec 038 — sellos de las cartas ya armadas", () => {
  it("test_s038_rf7_e_pasa_a_ur_en_la_ultra_rare_y_leg_a_ssr_en_la_ssr", () => {
    expect(renameSeal(conf({ texto: "E", estilo: "morado", esquina: "sup-izq" }), "epic")?.sello).toEqual({ texto: "UR", estilo: "morado", esquina: "sup-izq" });
    expect(renameSeal(conf({ texto: "LEG", estilo: "oro", esquina: "inf-der", tamano: 13 }), "legendary")?.sello).toEqual({ texto: "SSR", estilo: "oro", esquina: "inf-der", tamano: 13 });
    // Lo demás de la configuración no cambia.
    const c = conf({ texto: "E", estilo: "morado", esquina: "sup-izq" });
    expect(renameSeal(c, "epic")?.capas).toBe(c.capas);
  });

  it("test_s038_rf8_un_sello_escrito_a_mano_o_de_otra_rareza_no_se_toca", () => {
    expect(renameSeal(conf({ texto: "SR", estilo: "morado", esquina: "sup-izq" }), "epic")).toBeNull();
    // «E» en una carta que no es Ultra Rare lo escribió alguien a mano.
    expect(renameSeal(conf({ texto: "E", estilo: "morado", esquina: "sup-izq" }), "legendary")).toBeNull();
    expect(renameSeal(conf({ texto: "UR", estilo: "morado", esquina: "sup-izq" }), "epic")).toBeNull();
    expect(renameSeal(conf(null), "epic")).toBeNull();
    expect(renameSeal(conf({ key: "library/s.webp", esquina: "sup-izq" }), "epic")).toBeNull();
    expect(renameSeal(null, "epic")).toBeNull();
    expect(renameSeal(conf({ texto: "C", estilo: "plata", esquina: "sup-izq" }), "common")).toBeNull();
  });
});
