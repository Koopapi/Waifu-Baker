import { describe, expect, it } from "vitest";
import { adminAssetUrl, adminCardView } from "./admin-card";
import { finalCardConfig } from "./final-card";
import type { LayersConfig } from "./layers";

const layers: LayersConfig = {
  capas: [
    { key: "sets/s1/layers/fondo.webp", rol: "fondo" },
    { particulas: "destellos-dorados", cantidad: 10 },
    { key: "sets/s1/layers/chica.webp", rol: "personaje" },
  ],
  marco: "n",
  sello: { texto: "C", estilo: "plata", esquina: "sup-izq" },
};
const card = { rarity: "common" as const, layers, keyMid: "sets/s1/cards/c1/mid.aa.webp", keyHoloMid: "sets/s1/cards/c1/holo-mid.aa.webp" };

describe("spec 039 — la carta del armador en el panel", () => {
  it("test_s039_rf1_una_carta_armada_va_viva_con_la_vista_del_armador_y_enlaces_del_panel", () => {
    const v = adminCardView(card, false);
    expect(v.live?.tier).toBe("n");
    expect(v.live?.config).toEqual(finalCardConfig(layers, adminAssetUrl));
    const srcs = v.live!.config.capas.flatMap((l) => ("src" in l ? [l.src] : []));
    expect(srcs).toEqual(["/api/admin/assets/sets/s1/layers/fondo.webp", "/api/admin/assets/sets/s1/layers/chica.webp"]);
    expect(v.image).toBe("/api/admin/assets/sets/s1/cards/c1/mid.aa.webp");
    expect(v.holoFinish).toBe(false);
  });

  it("test_s039_rf4_rf6_una_copia_holo_usa_la_imagen_fija_holo", () => {
    expect(adminCardView(card, true)).toMatchObject({ image: "/api/admin/assets/sets/s1/cards/c1/holo-mid.aa.webp", holoFinish: false });
  });

  it("test_s039_rf6_una_copia_holo_sin_imagen_holo_usa_la_normal_con_acabado_holo", () => {
    expect(adminCardView({ ...card, keyHoloMid: null }, true)).toMatchObject({ image: "/api/admin/assets/sets/s1/cards/c1/mid.aa.webp", holoFinish: true });
  });

  it("test_s039_rf7_sin_efectos_del_vinculo", () => {
    // La configuración es exactamente la del armador: sin partículas ni brillos añadidos por un nivel de vínculo.
    expect(adminCardView(card, false).live?.config.capas).toHaveLength(layers.capas.length);
  });

  it("test_s039_rf8_lo_vigente_aunque_haya_cambios_pendientes", () => {
    const pending: LayersConfig = { ...layers, sello: { texto: "X", estilo: "oro", esquina: "sup-der" } };
    const v = adminCardView({ ...card, layersPending: pending } as typeof card, false);
    expect(v.live?.config.sello).toMatchObject({ texto: "C" });
  });

  it("test_s039_rf9_una_carta_sin_capas_va_sin_carta_viva", () => {
    expect(adminCardView({ ...card, layers: null }, false).live).toBeNull();
  });
});
