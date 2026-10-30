// Spec 017: subir la imagen de la chica crea la carta por capas; sustituirla conserva el encuadre.
import { describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import sharp from "sharp";
import { cards } from "@/db/schema";
import type { ImageLayer } from "@/domain/cards/layers";
import { createSet } from "@/server/services/collections";
import { replaceCardArt, uploadCardImage } from "@/server/services/cards";
import { saveCardLayers } from "@/server/services/card-layers";
import { stageLayerImage } from "@/server/cards/layer-images";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "CHI1", name: "Chicas", isAdult: false });
  const store = tempStore();
  const up = async (hue: number, opts: { cutout?: boolean; width?: number; height?: number } = { cutout: true }) =>
    uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue, ...opts }), mime: MIME.png, filename: `chica-${hue}.png` });
  return { admin, set, store, up };
}

describe("spec 017 — la chica crea la carta", () => {
  it("test_s017_rf1_cada_imagen_subida_crea_una_carta_con_la_chica_como_personaje", async () => {
    await inRollback(async (tx) => {
      const { set, store, up } = await setup(tx);
      for (const hue of [10, 140]) await up(hue);
      const rows = await tx.select().from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number));
      expect(rows).toHaveLength(2);
      for (const r of rows) {
        const capas = r.layers!.capas as ImageLayer[];
        expect(capas).toHaveLength(1);
        // Centrada en el lienzo, entera (contener) y al 100 %.
        expect(capas[0]).toMatchObject({ rol: "personaje", encuadre: { x: 0, y: 0, escala: 1, giro: 0, ajuste: "contener" } });
        expect(capas[0].key).toMatch(new RegExp(`^sets/${set.id}/layers/[0-9a-f]{64}\\.webp$`));
        const file = await store.get(capas[0].key);
        expect((await sharp(file!.body).metadata()).hasAlpha).toBe(true);
        // Sin rareza todavía: estilo automático del escalón n (marco plateado, sin partículas y con el sello C de la spec 022).
        expect(r.layers).toMatchObject({ marco: "n", sello: { texto: "C" }, estiloAuto: true });
      }
    });
  });

  it("test_s017_rf2_la_chica_en_jpeg_o_de_menos_de_991_px_de_alto_no_crea_carta", async () => {
    await inRollback(async (tx) => {
      const { admin, set, store, up } = await setup(tx);
      await expect(uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ format: "jpeg" }), mime: MIME.jpeg, filename: "a.jpg" })).rejects.toMatchObject({ code: "character_type" });
      await expect(up(1, { cutout: true, width: 1400, height: 900 })).rejects.toMatchObject({ code: "character_too_short" });
      expect(await tx.select().from(cards).where(eq(cards.setId, set.id))).toHaveLength(0);
    });
  });

  it("test_s017_rf3_una_imagen_sin_transparencia_crea_la_carta_con_aviso", async () => {
    await inRollback(async (tx) => {
      const { up } = await setup(tx);
      expect((await up(20, {})).uncut).toBe(true);
      expect((await up(80, { cutout: true })).uncut).toBe(false);
    });
  });

  it("test_s017_rf4_sustituir_la_chica_conserva_el_encuadre_y_el_resto_de_capas", async () => {
    await inRollback(async (tx) => {
      const { admin, store, up } = await setup(tx);
      const card = await up(30);
      const chica = (card.layers!.capas[0] as ImageLayer).key;
      const fondo = (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue: 300 }), mime: MIME.png, filename: "f.png" }, "layer")).key;
      const framed = { ...card.layers!, capas: [{ key: fondo, rol: "fondo" }, { key: chica, rol: "personaje", encuadre: { x: 12, y: -4, escala: 1.3, giro: 8, ajuste: "contener" } }] };
      const saved = await saveCardLayers(tx, store, admin.id, card.id, { config: framed, expectedVersion: card.version });
      const before = saved.card.layers!.capas as ImageLayer[];

      const after = await replaceCardArt(tx, store, admin.id, card.id, saved.card.version, { body: await testImage({ hue: 200, cutout: true }), mime: MIME.png, filename: "nueva.png" });
      const capas = after.layers!.capas as ImageLayer[];
      expect(capas[0]).toEqual(before[0]);
      expect(capas[1]).toMatchObject({ rol: "personaje", encuadre: { x: 12, y: -4, escala: 1.3, giro: 8, ajuste: "contener" } });
      expect(capas[1].key).not.toBe(before[1].key);
      expect(await store.get(capas[1].key)).not.toBeNull();
      // La chica anterior ya no la usa ninguna carta: se borra.
      expect(await store.get(before[1].key)).toBeNull();
    });
  });
});
