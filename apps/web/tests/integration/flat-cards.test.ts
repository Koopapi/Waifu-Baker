// Spec 018: la imagen fija de la carta se genera al crearla, al guardar sus capas y al cambiar su rareza.
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { cards } from "@/db/schema";
import { createSet } from "@/server/services/collections";
import { updateCard, uploadCardImage } from "@/server/services/cards";
import { saveCardLayers } from "@/server/services/card-layers";
import { stageLayerImage } from "@/server/cards/layer-images";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";
import { setFlattener } from "@/server/cards/flat-store";

// Estos tests miran la imagen fija de verdad: dibujo con Chromium.
beforeAll(() => setFlattener(null));

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function setup(tx: Tx) {
  const admin = await makeAdmin(tx);
  const set = await createSet(tx, admin.id, { code: "FLAT1", name: "Fijas", isAdult: false });
  const store = tempStore();
  const card = await uploadCardImage(tx, store, admin.id, set.id, { body: await testImage({ hue: 30, cutout: true }), mime: MIME.png, filename: "c.png" });
  const load = async () => (await tx.select().from(cards).where(eq(cards.id, card.id)))[0];
  return { admin, set, store, card, load };
}

const size = async (store: ReturnType<typeof tempStore>, key: string | null) => {
  const meta = await sharp((await store.get(key!))!.body).metadata();
  return [meta.width, meta.height];
};

describe("spec 018 — cuándo se genera la imagen fija", () => {
  it("test_s018_rf2_la_carta_creada_desde_la_chica_ya_tiene_su_imagen_fija", async () => {
    await inRollback(async (tx) => {
      const { store, card } = await setup(tx);
      expect(await size(store, card.keyFull)).toEqual([1400, 1982]);
      expect(await size(store, card.keyMid)).toEqual([700, 991]);
      expect(await size(store, card.keyThumb)).toEqual([300, 425]);
      expect(await size(store, card.keyPublic)).toEqual([600, 849]);
      expect(card.blurhash).toBeTruthy();
    });
  });

  it("test_s018_rf3_guardar_las_capas_regenera_la_imagen_fija_y_borra_la_anterior", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load } = await setup(tx);
      const fondo = (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue: 140 }), mime: MIME.png, filename: "f.png" }, "layer")).key;
      const r = await saveCardLayers(tx, store, admin.id, card.id, { config: { ...card.layers!, capas: [{ key: fondo, rol: "fondo" }, ...card.layers!.capas] }, expectedVersion: card.version });
      const after = await load();
      expect(after.keyFull).not.toBe(card.keyFull);
      expect(r.card.keyFull).toBe(after.keyFull);
      expect(await store.get(after.keyFull!)).not.toBeNull();
      expect(await store.get(card.keyFull!)).toBeNull();
    });
  });

  it("test_s018_rf3_cambiar_la_rareza_regenera_la_imagen_fija", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load } = await setup(tx);
      await updateCard(tx, store, admin.id, card.id, card.version, { rarity: "legendary" });
      const after = await load();
      expect(after.layers?.marco).toBe("ssr");
      expect(after.keyFull).not.toBe(card.keyFull);
    });
  });

  it("test_s018_rf4_si_no_se_puede_generar_la_imagen_fija_no_se_guarda", async () => {
    await inRollback(async (tx) => {
      const { admin, store, card, load } = await setup(tx);
      // Un archivo que no es una imagen en el área temporal: no se puede dibujar.
      const bad = "tmp/layers/0b6f3c4e-8a1d-4c7e-9f2a-1d2e3f4a5b6c.webp";
      await store.put(bad, Buffer.from("no soy una imagen"));
      await expect(
        saveCardLayers(tx, store, admin.id, card.id, { config: { ...card.layers!, capas: [{ key: bad, rol: "fondo" }, ...card.layers!.capas] }, expectedVersion: card.version }),
      ).rejects.toMatchObject({ code: "flatten_failed" });
      const after = await load();
      expect(after.version).toBe(card.version);
      expect(after.keyFull).toBe(card.keyFull);
    });
  });
});
