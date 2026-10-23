import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { applyTierStyle, retierLayers } from "./layers-rarity";

const key = (n: number) => `sets/s1/layers/${String(n).padStart(64, "0")}.webp`;
const config: LayersConfig = {
  capas: [{ key: key(1), profundidad: 0.2 }, { particulas: "nieve", cantidad: 10 }, { key: key(2), profundidad: 1 }],
  marco: "n",
  sello: { key: key(9), esquina: "inf-der" },
};

describe("spec 016 — estilo de la rareza", () => {
  it("test_s016_rf9_aplicar_el_estilo_pone_marco_particulas_y_sello_del_escalon", () => {
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

  it("test_s016_rf9_el_escalon_n_no_lleva_particulas_ni_sello", () => {
    const out = applyTierStyle(config, "n", 1);
    expect(out.capas.every((l) => "key" in l)).toBe(true);
    expect(out.sello).toBeNull();
    expect(out.holo).toBe(false);
  });

  it("test_s016_rf9_la_ur_activa_el_holo", () => {
    expect(applyTierStyle(config, "ur", 1).holo).toBe(true);
  });
});

describe("spec 016 — cambio de rareza de una carta con capas", () => {
  const withText: LayersConfig = {
    capas: [{ key: key(1), profundidad: 0.2 }, { particulas: "nieve", cantidad: 10 }],
    marco: "r",
    sello: { texto: "R", estilo: "plata", esquina: "inf-der", tamano: 12 },
  };

  it("test_s016_rf25_el_marco_y_el_sello_de_texto_siguen_al_escalon_nuevo_y_las_particulas_no_cambian", () => {
    const { config: out, imageSealToReview } = retierLayers(withText, "ssr");
    expect(out.marco).toBe("ssr");
    // El sello de texto pasa al del escalón, pero conserva la esquina que eligió el administrador.
    expect(out.sello).toEqual({ texto: "SSR", estilo: "oro", tamano: 14, esquina: "inf-der" });
    expect(out.capas).toEqual(withText.capas);
    expect(imageSealToReview).toBe(false);
  });

  it("test_s016_rf25_un_escalon_sin_sello_quita_el_sello_de_texto", () => {
    expect(retierLayers(withText, "n").config.sello).toBeNull();
  });

  it("test_s016_rf25_el_sello_de_imagen_se_mantiene_y_avisa_de_que_hay_que_revisarlo", () => {
    const { config: out, imageSealToReview } = retierLayers(config, "ur");
    expect(out.marco).toBe("ur");
    expect(out.sello).toEqual(config.sello);
    expect(out.capas).toEqual(config.capas);
    expect(imageSealToReview).toBe(true);
  });

  it("test_s016_rf25_sin_sello_no_pone_uno_ni_avisa", () => {
    const { config: out, imageSealToReview } = retierLayers({ ...withText, sello: null }, "sr");
    expect(out.sello).toBeNull();
    expect(imageSealToReview).toBe(false);
  });
});
