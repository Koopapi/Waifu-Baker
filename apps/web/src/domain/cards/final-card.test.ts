import { describe, expect, it } from "vitest";
import { VIEW_DEFAULTS, configSignature, finalCardConfig } from "./final-card";
import { layersConfigSchema, type LayersConfig } from "./layers";

const base: LayersConfig = {
  capas: [
    { key: "library/fondo.webp", rol: "fondo", profundidad: 0.2, margen: 5 },
    { particulas: "nieve", profundidad: 0.5 },
    { key: "sets/s/layers/chica.webp", rol: "personaje", profundidad: 1, encuadre: { x: 4, y: -2, escala: 1.1, giro: 0 } },
  ],
  marco: "r",
  sello: { key: "sets/s/layers/sello.webp", esquina: "sup-der" },
} as unknown as LayersConfig;

const panel = (k: string) => `/api/admin/assets/${k}`;
const signed = (k: string) => `/api/cards/c1/layers?k=${encodeURIComponent(k)}&sig=abc&exp=1`;

describe("spec 034 — la carta final", () => {
  it("test_s034_rf1_cada_capa_lleva_el_encuadre_completo_del_armador", () => {
    const cfg = finalCardConfig(base, panel);
    const [fondo, , chica] = cfg.capas as Record<string, unknown>[];
    expect(fondo.encuadre).toEqual({ x: 0, y: 0, escala: 1, giro: 0, ajuste: "cubrir" });
    expect(chica.encuadre).toEqual({ x: 4, y: -2, escala: 1.1, giro: 0, ajuste: "contener" });
    expect(fondo.src).toBe("/api/admin/assets/library/fondo.webp");
    expect(fondo).not.toHaveProperty("key");
    expect(cfg.sello).toMatchObject({ src: "/api/admin/assets/sets/s/layers/sello.webp" });
  });

  it("test_s034_rf5_el_armador_y_el_coleccionista_dan_la_misma_firma", () => {
    expect(configSignature(finalCardConfig(base, panel))).toBe(configSignature(finalCardConfig(base, signed)));
    // La vista previa del armador añade cosas que no cambian cómo se ve.
    expect(configSignature({ ...finalCardConfig(base, panel), aparecer: false, etiqueta: "x" })).toBe(configSignature(finalCardConfig(base, signed)));
    expect(configSignature(finalCardConfig({ ...base, marco: "sr" } as LayersConfig, panel))).not.toBe(configSignature(finalCardConfig(base, panel)));
  });

  it("test_s034_rf14_una_carta_antigua_usa_los_valores_de_fabrica", () => {
    expect(finalCardConfig(base, panel)).toMatchObject({ ...VIEW_DEFAULTS, holo: false });
    expect(VIEW_DEFAULTS).toEqual({ profundidad: 14, inclinacion: 14, reposo: true });
  });

  it("test_s034_rf12_el_movimiento_y_el_holo_guardados_se_respetan", () => {
    const cfg = finalCardConfig({ ...base, profundidad: 0, inclinacion: 6, reposo: false, holo: true, holoIntensidad: 0.8 }, panel);
    expect(cfg).toMatchObject({ profundidad: 0, inclinacion: 6, reposo: false, holo: true, holoIntensidad: 0.8 });
  });

  it("test_s034_rf12_el_esquema_acepta_y_limita_el_movimiento", () => {
    const ok = layersConfigSchema.safeParse({ ...base, profundidad: 30, inclinacion: 0, reposo: false });
    expect(ok.success).toBe(true);
    expect(layersConfigSchema.safeParse({ ...base, profundidad: 31 }).success).toBe(false);
    expect(layersConfigSchema.safeParse({ ...base, inclinacion: -1 }).success).toBe(false);
  });
});
