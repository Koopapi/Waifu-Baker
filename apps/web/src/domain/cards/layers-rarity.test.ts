import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { applyTierStyle } from "./layers-rarity";

const key = (n: number) => `sets/s1/layers/${String(n).padStart(64, "0")}.webp`;
const config: LayersConfig = {
  capas: [{ key: key(1), profundidad: 0.2 }, { particulas: "nieve", cantidad: 10 }, { key: key(2), profundidad: 1 }],
  marco: "n",
  sello: { key: key(9), esquina: "inf-der" },
};

describe("spec 016 — estilo de la rareza", () => {
  it("test_s016_rf13_aplicar_el_estilo_pone_marco_particulas_y_sello_del_escalon", () => {
    const out = applyTierStyle(config, "ssr", 42);
    expect(out.marco).toBe("ssr");
    expect(out.sello).toEqual({ texto: "SSR", estilo: "oro", tamano: 14, esquina: "sup-izq" });
    // Las partículas del preset sustituyen a las que había y van entre el fondo y la personaje.
    expect(out.capas).toEqual([
      { key: key(1), profundidad: 0.2 },
      { particulas: "destellos-dorados", cantidad: 55, semilla: 42, profundidad: 0.55, margen: 4 },
      { key: key(2), profundidad: 1 },
    ]);
  });

  it("test_s016_rf13_el_escalon_n_no_lleva_particulas_ni_sello", () => {
    const out = applyTierStyle(config, "n", 1);
    expect(out.capas.every((l) => "key" in l)).toBe(true);
    expect(out.sello).toBeNull();
    expect(out.holo).toBe(false);
  });

  it("test_s016_rf13_la_ur_activa_el_holo", () => {
    expect(applyTierStyle(config, "ur", 1).holo).toBe(true);
  });
});
