import { describe, expect, it } from "vitest";
import type { LayersConfig } from "./layers";
import { applyTierStyle, retierLayers, settleAutoStyle } from "./layers-rarity";

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

describe("spec 017 — estilo automático", () => {
  const armada: LayersConfig = {
    capas: [
      { key: key(1), rol: "fondo" },
      { particulas: "destellos-arcoiris", cantidad: 36, semilla: 7, profundidad: 0.55, margen: 4 },
      { key: key(2), rol: "personaje", encuadre: { x: 5, escala: 1.2 } },
    ],
    marco: "sr",
    sello: { texto: "SR", estilo: "morado", tamano: 12, esquina: "inf-der" },
    estiloAuto: true,
  };

  it("test_s017_rf13_con_estilo_automatico_el_cambio_de_rareza_pone_el_estilo_completo_del_escalon", () => {
    const { config: out, imageSealToReview } = retierLayers(armada, "ur");
    expect(imageSealToReview).toBe(false);
    expect(out).toMatchObject({ marco: "ur", holo: true, estiloAuto: true, sello: { texto: "UR", estilo: "arcoiris", esquina: "sup-izq" } });
    // Las partículas cambian a las del escalón (misma semilla) y siguen detrás de la chica; sus capas no se tocan.
    expect(out.capas).toEqual([
      { key: key(1), rol: "fondo" },
      { particulas: "destellos-arcoiris", cantidad: 65, semilla: 7, profundidad: 0.55, margen: 4 },
      { key: key(2), rol: "personaje", encuadre: { x: 5, escala: 1.2 } },
    ]);
    // Un escalón sin partículas ni sello los quita.
    const n = retierLayers(armada, "n").config;
    expect(n.capas.every((l) => "key" in l)).toBe(true);
    expect(n.sello).toBeNull();
  });

  it("test_s017_rf13_las_particulas_del_estilo_van_detras_de_la_chica", () => {
    const soloChica: LayersConfig = { capas: [{ key: key(2), rol: "personaje" }], marco: "n", sello: null, estiloAuto: true };
    expect(applyTierStyle(soloChica, "ssr", 3).capas.map((l) => ("key" in l ? l.rol : "particulas"))).toEqual(["particulas", "personaje"]);
  });

  it("test_s017_rf14_sin_estilo_automatico_sigue_la_regla_de_la_spec_016", () => {
    const manual = { ...armada, estiloAuto: false };
    const out = retierLayers(manual, "ssr").config;
    expect(out.marco).toBe("ssr");
    expect(out.sello).toEqual({ texto: "SSR", estilo: "oro", tamano: 14, esquina: "inf-der" });
    expect(out.capas).toEqual(manual.capas);
  });

  it("test_s017_rf14_tocar_marco_particulas_o_sello_apaga_el_estilo_automatico", () => {
    expect(settleAutoStyle(armada, { ...armada, capas: [...armada.capas].reverse() }).estiloAuto).toBe(true);
    expect(settleAutoStyle(armada, { ...armada, capas: armada.capas.map((l) => ("key" in l && l.rol === "personaje" ? { ...l, encuadre: { x: 30 } } : l)) }).estiloAuto).toBe(true);
    expect(settleAutoStyle(armada, { ...armada, marco: "ssr" }).estiloAuto).toBe(false);
    expect(settleAutoStyle(armada, { ...armada, sello: null }).estiloAuto).toBe(false);
    expect(settleAutoStyle(armada, { ...armada, capas: armada.capas.map((l) => ("particulas" in l ? { ...l, cantidad: 10 } : l)) }).estiloAuto).toBe(false);
    // Una vez apagado, no vuelve solo.
    expect(settleAutoStyle({ ...armada, estiloAuto: false }, { ...armada, estiloAuto: true }).estiloAuto).toBe(false);
    // Sin configuración anterior, se respeta lo que llega.
    expect(settleAutoStyle(null, armada).estiloAuto).toBe(true);
  });
});

describe("spec 017 — volver al estilo automático", () => {
  const chica: LayersConfig = { capas: [{ key: key(1), rol: "fondo" }, { key: key(2), rol: "personaje" }], marco: "n", sello: { texto: "X", estilo: "oro", esquina: "inf-der" }, estiloAuto: false };

  it("test_s017_rf13_aplicar_el_estilo_de_la_rareza_vuelve_a_activar_el_automatico", () => {
    const reapplied = { ...applyTierStyle(chica, "ssr", 5), estiloAuto: true };
    expect(settleAutoStyle(chica, reapplied, "ssr").estiloAuto).toBe(true);
    // Si después de aplicarlo se toca algo del estilo, ya no es el del escalón.
    expect(settleAutoStyle(chica, { ...reapplied, marco: "ur" }, "ssr").estiloAuto).toBe(false);
  });
});
