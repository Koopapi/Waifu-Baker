// Spec 017: la imagen de la chica (personaje) que crea la carta: formato, tamaño y aviso de «sin recortar».
import { describe, expect, it } from "vitest";
import { stageCharacterImage } from "@/server/cards/character-images";
import { MIME, testImage } from "./images";
import { tempStore } from "./store";

describe("spec 017 — imagen de la chica", () => {
  it("test_s017_rf2_acepta_png_y_webp_de_cualquier_proporcion", async () => {
    const store = tempStore();
    for (const [format, size] of [["png", { width: 800, height: 1200 }], ["webp", { width: 1600, height: 1000 }]] as const) {
      const staged = await stageCharacterImage(store, { body: await testImage({ ...size, format, cutout: true }), mime: MIME[format], filename: `chica.${format}` });
      expect(staged.key).toMatch(/^tmp\/layers\/[0-9a-f-]{36}\.webp$/);
      // Conserva su proporción (no se ajusta al lienzo).
      expect(staged.width / staged.height).toBeCloseTo(size.width / size.height, 2);
    }
  });

  it("test_s017_rf2_jpeg_o_mas_de_20_mb_se_rechaza", async () => {
    const store = tempStore();
    await expect(stageCharacterImage(store, { body: await testImage({ format: "jpeg" }), mime: MIME.jpeg, filename: "a.jpg" })).rejects.toMatchObject({ code: "character_type" });
    await expect(stageCharacterImage(store, { body: Buffer.alloc(21 * 1024 * 1024), mime: MIME.png, filename: "big.png" })).rejects.toMatchObject({ code: "too_large" });
  });

  it("test_s017_rf2_menos_de_991_px_de_alto_se_rechaza", async () => {
    const store = tempStore();
    await expect(stageCharacterImage(store, { body: await testImage({ width: 1400, height: 900, cutout: true }), mime: MIME.png, filename: "a.png" })).rejects.toMatchObject({
      code: "character_too_short",
      params: { height: 900, min: 991 },
    });
  });

  it("test_s017_rf2_una_chica_muy_grande_se_guarda_a_la_altura_del_lienzo_doble", async () => {
    const store = tempStore();
    const staged = await stageCharacterImage(store, { body: await testImage({ width: 2000, height: 3000, cutout: true }), mime: MIME.png, filename: "a.png" });
    expect(staged).toMatchObject({ width: 1321, height: 1982 });
  });

  it("test_s017_rf3_sin_transparencia_se_acepta_con_aviso", async () => {
    const store = tempStore();
    const full = await stageCharacterImage(store, { body: await testImage({ width: 800, height: 1200 }), mime: MIME.png, filename: "a.png" });
    expect(full.uncut).toBe(true);
    const cut = await stageCharacterImage(store, { body: await testImage({ width: 800, height: 1200, cutout: true }), mime: MIME.png, filename: "b.png" });
    expect(cut.uncut).toBe(false);
    // El recorte se conserva al pasar a WebP.
    expect((await store.get(cut.key))?.contentType).toBe("image/webp");
  });
});
