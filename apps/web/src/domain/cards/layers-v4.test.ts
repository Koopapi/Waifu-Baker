// Spec 025: lo nuevo de la configuración por capas (carta-capas.js v4 y marco personalizado). Reglas puras.
import { describe, expect, it } from "vitest";
import { checkLayersConfig, type LayersConfig } from "./layers";
import { exportCreatorConfig, parseCreatorConfig } from "./layers-io";
import { applyTierStyle, retierLayers, settleAutoStyle } from "./layers-rarity";

const chica = `tmp/layers/${"1".repeat(8)}-1111-1111-1111-${"1".repeat(12)}.webp`;
const base: LayersConfig = { capas: [{ key: chica, rol: "personaje" }], marco: "sr", sello: { texto: "E", estilo: "morado", esquina: "sup-izq" } };
const custom: LayersConfig = { ...base, marco: "personalizado", marcoColores: { color: "#6d5cff", brillo: "#d7ff3a" } };

describe("spec 025 — configuración", () => {
  it("test_s025_rf1_la_capa_de_imagen_acepta_un_brillo_de_tipo_conocido", () => {
    const ok = checkLayersConfig({ ...base, capas: [{ key: chica, rol: "personaje", brillo: { tipo: "holo", intensidad: 0.7 } }] });
    expect(ok.ok).toBe(true);
    expect(checkLayersConfig({ ...base, capas: [{ key: chica, brillo: { tipo: "neon" } }] })).toMatchObject({ ok: false, issue: { code: "invalid_layers" } });
    expect(checkLayersConfig({ ...base, capas: [{ key: chica, brillo: { tipo: "oro", intensidad: 2 } }] }).ok).toBe(false);
  });

  it("test_s025_rf3_la_intensidad_del_holo_va_de_0_a_1", () => {
    expect(checkLayersConfig({ ...base, holo: true, holoIntensidad: 0.6 }).ok).toBe(true);
    expect(checkLayersConfig({ ...base, holo: true, holoIntensidad: 1.5 }).ok).toBe(false);
  });

  it("test_s025_rf7_una_configuracion_anterior_sigue_siendo_valida", () => {
    expect(checkLayersConfig(base)).toEqual({ ok: true, config: base });
  });

  it("test_s025_rf16_rf19_marco_personalizado_con_dos_colores_hexadecimales_o_sin_marco", () => {
    expect(checkLayersConfig(custom).ok).toBe(true);
    expect(checkLayersConfig({ ...base, marco: "ninguno" }).ok).toBe(true);
    expect(checkLayersConfig({ ...base, marco: "personalizado" })).toMatchObject({ ok: false, issue: { code: "invalid_layers", path: "marcoColores" } });
    expect(checkLayersConfig({ ...custom, marcoColores: { color: "red", brillo: "#d7ff3a" } }).ok).toBe(false);
    expect(checkLayersConfig({ ...custom, marcoColores: { color: "#6d5cff;x:url(y)", brillo: "#d7ff3a" } }).ok).toBe(false);
  });
});

describe("spec 025 — cambio de rareza", () => {
  it("test_s025_rf17_el_marco_personalizado_se_conserva_y_el_sello_sigue_a_la_rareza", () => {
    const { config } = retierLayers(custom, "ssr");
    expect(config.marco).toBe("personalizado");
    expect(config.marcoColores).toEqual(custom.marcoColores);
    expect(config.sello).toMatchObject({ texto: "LEG" });
    expect(retierLayers({ ...base, marco: "ninguno" }, "ur").config.marco).toBe("ninguno");
    // Con el marco de la rareza, sigue como antes.
    expect(retierLayers(base, "ssr").config.marco).toBe("ssr");
  });

  it("test_s025_aplicar_el_estilo_de_la_rareza_vuelve_al_marco_de_la_rareza", () => {
    expect(applyTierStyle(custom, "r", 1).marco).toBe("r");
  });

  it("test_s025_rf17_cambiar_a_marco_personalizado_apaga_el_estilo_automatico", () => {
    const auto = { ...applyTierStyle(base, "sr", 1), estiloAuto: true };
    expect(settleAutoStyle(auto, { ...auto, marco: "personalizado", marcoColores: { color: "#112233", brillo: "#ffffff" } }, "sr").estiloAuto).toBe(false);
  });
});

describe("spec 025 — importar y exportar en el formato v4", () => {
  it("test_s025_rf30_exporta_ex_brillo_e_intensidad_del_holo", () => {
    const cfg: LayersConfig = { ...base, marco: "ur", holo: true, holoIntensidad: 0.6, capas: [{ key: chica, rol: "personaje", brillo: { tipo: "holo", intensidad: 0.7 } }] };
    const { json } = exportCreatorConfig(cfg, "yuki");
    expect(json).toMatchObject({ marco: "ex", holo: true, holoIntensidad: 0.6 });
    expect((json.capas as Record<string, unknown>[])[0]).toMatchObject({ brillo: { tipo: "holo", intensidad: 0.7 } });
  });

  it("test_s025_rf30_el_marco_personalizado_se_exporta_como_el_degradado_del_configurador", () => {
    const { json } = exportCreatorConfig(custom, "nyx");
    expect(json.marco).toBe("linear-gradient(135deg,#312973 0%,#d7ff3a 18%,#6d5cff 34%,#ffffff 48%,#6d5cff 62%,#d7ff3a 80%,#312973 100%)");
    expect(json.aura).toBe("rgba(109,92,255,.25)");
  });

  it("test_s025_rf29_importa_una_carta_del_configurador_v4_con_brillo_holo_y_ex", () => {
    const r = parseCreatorConfig({
      marco: "ex",
      holo: true,
      holoIntensidad: 0.4,
      capas: [
        { src: "cartas/yuki/yuki_1_fondo.webp", profundidad: 0.2, margen: 5 },
        { src: "cartas/yuki/yuki_3_personaje.webp", brillo: { tipo: "holo", intensidad: 0.7 }, profundidad: 1 },
      ],
      sello: { texto: "EX", estilo: "arcoiris", esquina: "sup-izq", tamano: 14 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config).toMatchObject({ marco: "ur", holo: true, holoIntensidad: 0.4 });
    expect(r.config.capas[1]).toMatchObject({ rol: "personaje", brillo: { tipo: "holo", intensidad: 0.7 } });
  });

  it("test_s025_rf29_el_degradado_personalizado_vuelve_a_ser_un_marco_de_dos_colores", () => {
    const { json } = exportCreatorConfig(custom, "nyx");
    const r = parseCreatorConfig({ ...json, capas: [{ src: "nyx_1_personaje.webp" }], sello: null });
    expect(r.ok && r.config).toMatchObject({ marco: "personalizado", marcoColores: { color: "#6d5cff", brillo: "#d7ff3a" } });
    // Un degradado cualquiera (no del configurador) no se acepta.
    expect(parseCreatorConfig({ marco: "linear-gradient(red,blue)", capas: [], sello: null })).toMatchObject({ ok: false, path: "marco" });
  });

  it("test_s025_los_cuatro_modos_de_mezcla_que_faltan_pasan_a_normal", () => {
    const r = parseCreatorConfig({ marco: "ssr", capas: [{ src: "a_personaje.webp", mezcla: "hue" }], sello: null });
    expect(r.ok && r.changedBlends).toEqual([1]);
  });
});
