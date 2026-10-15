import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { composeCard, CARD_SIZES } from "@/server/cards/compose";
import { testImage } from "./images";

describe("RF-16 composición de la carta", () => {
  it("test_rf16_genera los 4 tamaños y el blurhash", async () => {
    const art = await testImage();
    const out = await composeCard(art, { number: 7, rarity: "epic", setCode: "WB01" });
    for (const size of Object.keys(CARD_SIZES) as (keyof typeof CARD_SIZES)[]) {
      const meta = await sharp(out[size]).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([CARD_SIZES[size].width, CARD_SIZES[size].height, "webp"]);
    }
    expect(out.blurhash).toMatch(/^[0-9A-Za-z#$%*+,\-.:;=?@[\]^_{|}~]{20,}$/);
  });

  it("test_rf16_las esquinas quedan transparentes (carta redondeada)", async () => {
    const out = await composeCard(await testImage(), { number: 1, rarity: "common", setCode: "WB01" });
    const { data, info } = await sharp(out.mid).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    expect(data[3]).toBe(0); // alfa del píxel (0,0)
  });

  it("test_rf16_cambiar la rareza cambia la imagen compuesta", async () => {
    const art = await testImage();
    const a = await composeCard(art, { number: 1, rarity: "common", setCode: "WB01" });
    const b = await composeCard(art, { number: 1, rarity: "legendary", setCode: "WB01" });
    expect(a.thumb.equals(b.thumb)).toBe(false);
  });

  it("admite cartas sin rareza todavía", async () => {
    const out = await composeCard(await testImage(), { number: 12, rarity: null, setCode: "WB01" });
    expect(out.full.length).toBeGreaterThan(1000);
  });

  it("test_rf16_cambiar el número cambia la imagen; la carta no lleva el nombre", async () => {
    const art = await testImage();
    const a = await composeCard(art, { number: 1, rarity: "rare", setCode: "WB01" });
    const b = await composeCard(art, { number: 2, rarity: "rare", setCode: "WB01" });
    expect(a.thumb.equals(b.thumb)).toBe(false);
  });
});

describe("Marcos de Pencil", () => {
  it("existe un marco 1500×2100 con ventana transparente para cada rareza y para «sin rareza»", async () => {
    for (const r of ["common", "uncommon", "rare", "epic", "legendary", "secret", "none"]) {
      const { data, info } = await sharp(`assets/frames/frame_${r}.png`).raw().toBuffer({ resolveWithObject: true });
      expect([info.width, info.height, info.channels]).toEqual([1500, 2100, 4]);
      expect(data[(1000 * 1500 + 750) * 4 + 3]).toBe(0);
    }
  });


});
