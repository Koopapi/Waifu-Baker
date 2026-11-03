// Spec 016 (RNF) y spec 027, RF-15: las capas subidas al área temporal que nunca se guardan se borran a los 5 días
// (eran 24 h; un borrador recuperable del navegador vive 5 días y necesita sus imágenes).
import { utimes } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { purgeTempLayers, stageLayerImage, TEMP_LAYER_TTL_MS } from "@/server/cards/layer-images";
import { DRAFT_TTL_MS } from "@/domain/cards/draft";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

const DAY = 24 * 60 * 60 * 1000;

describe("spec 016 — limpieza del área temporal de capas", () => {
  it("test_s016_test_s027_rf15_borra_las_capas_temporales_de_mas_de_5_dias_y_deja_las_recientes", async () => {
    // Las imágenes sin guardar viven lo mismo que el borrador del navegador.
    expect(TEMP_LAYER_TTL_MS).toBe(5 * DAY);
    expect(TEMP_LAYER_TTL_MS).toBe(DRAFT_TTL_MS);
    const store = tempStore();
    const stage = async (hue: number) =>
      (await stageLayerImage(store, { body: await testImage({ width: 1400, height: 1982, hue }), mime: MIME.png, filename: `${hue}.png` }, "layer")).key;
    const [old, fresh, recent] = [await stage(10), await stage(200), await stage(90)];
    const now = new Date();
    const sixDaysAgo = new Date(now.getTime() - 6 * DAY);
    const twoDaysAgo = new Date(now.getTime() - 2 * DAY);
    const root = (store as unknown as { root: string }).root;
    await utimes(path.join(root, old), sixDaysAgo, sixDaysAgo);
    // Dos días ya no es viejo: con 24 h se habría borrado y el borrador habría perdido su imagen.
    await utimes(path.join(root, recent), twoDaysAgo, twoDaysAgo);
    // Algo fuera del área temporal nunca se toca, por viejo que sea.
    await store.put("sets/s1/layers/keep.webp", Buffer.from("x"));
    await utimes(path.join(root, "sets/s1/layers/keep.webp"), sixDaysAgo, sixDaysAgo);

    expect(await purgeTempLayers(store, now)).toBe(1);
    expect(await store.get(old)).toBeNull();
    expect(await store.get(fresh)).not.toBeNull();
    expect(await store.get(recent)).not.toBeNull();
    expect(await store.get("sets/s1/layers/keep.webp")).not.toBeNull();
  });
});
