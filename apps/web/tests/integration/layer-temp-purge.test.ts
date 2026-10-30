// Spec 016 (RNF): las capas subidas al área temporal que nunca se guardan se borran a las 24 h.
import { utimes } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { purgeTempLayers, stageLayerImage } from "@/server/cards/layer-images";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

describe("spec 016 — limpieza del área temporal de capas", () => {
  it("test_s016_borra_las_capas_temporales_de_mas_de_24_h_y_deja_las_recientes", async () => {
    const store = tempStore();
    const stage = async (hue: number) =>
      (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue }), mime: MIME.png, filename: `${hue}.png` }, "layer")).key;
    const [old, fresh] = [await stage(10), await stage(200)];
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const root = (store as unknown as { root: string }).root;
    await utimes(path.join(root, old), twoDaysAgo, twoDaysAgo);
    // Algo fuera del área temporal nunca se toca, por viejo que sea.
    await store.put("sets/s1/layers/keep.webp", Buffer.from("x"));
    await utimes(path.join(root, "sets/s1/layers/keep.webp"), twoDaysAgo, twoDaysAgo);

    expect(await purgeTempLayers(store, now)).toBe(1);
    expect(await store.get(old)).toBeNull();
    expect(await store.get(fresh)).not.toBeNull();
    expect(await store.get("sets/s1/layers/keep.webp")).not.toBeNull();
  });
});
