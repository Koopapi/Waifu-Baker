// Spec 018: la imagen fija de una carta armada sale del mismo carta-capas.js (Chromium sin ventana).
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { LayersConfig } from "@/domain/cards/layers";
import { FLAT_SIZES, flattenCard, renderFlatCard } from "@/server/cards/flatten";
import { testImage } from "./images";

const pixel = async (png: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

/** Diferencia media por canal (0–255) entre dos imágenes del mismo tamaño, transparencia incluida. */
async function meanDiff(a: Buffer, b: Buffer) {
  const [x, y] = await Promise.all([a, b].map((img) => sharp(img).ensureAlpha().raw().toBuffer()));
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i]);
  return sum / x.length;
}

async function images() {
  const fondo = await sharp(await testImage({ width: 1400, height: 1982, hue: 0 })).webp().toBuffer();
  const chica = await sharp(await testImage({ width: 800, height: 1200, hue: 220, cutout: true })).webp().toBuffer();
  return new Map([["k/fondo", fondo], ["k/chica", chica]]);
}

const config: LayersConfig = {
  capas: [
    { key: "k/fondo", rol: "fondo", profundidad: 0.2, margen: 5 },
    { particulas: "destellos-dorados", cantidad: 30, semilla: 7, profundidad: 0.55, margen: 4 },
    { key: "k/chica", rol: "personaje", encuadre: { x: 0, y: 0, escala: 1, giro: 0, ajuste: "contener" } },
  ],
  marco: "ssr",
  sello: { texto: "SSR", estilo: "oro", esquina: "sup-izq", tamano: 14 },
};

// La primera vez abre Chromium: en la CI tarda más.
const SLOW = 60_000;

describe("spec 018 — imagen fija", () => {

  it("test_s018_rf1_la_imagen_fija_es_la_carta_completa_a_1400_por_1982", async () => {
    const png = await flattenCard(config, await images());
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([1400, 1982]);
    // Esquinas redondeadas: transparentes; el centro, opaco.
    expect((await pixel(png, 2, 2))[3]).toBe(0);
    expect((await pixel(png, 700, 991))[3]).toBe(255);
    // El marco SSR es dorado (rojo > azul) en el centro del borde izquierdo.
    const [r, , b] = await pixel(png, 12, 991);
    expect(r).toBeGreaterThan(b + 40);
  }, SLOW);

  it("test_s018_rf1_la_misma_carta_da_la_misma_imagen", async () => {
    const imgs = await images();
    const [a, b] = [await flattenCard(config, imgs), await flattenCard(config, imgs)];
    expect(await meanDiff(a, b)).toBeLessThan(0.5);
  }, SLOW);

  it("test_s018_rf1_salen_los_tamanos_y_la_publica_lleva_marca_de_agua", async () => {
    const out = await renderFlatCard(config, await images());
    for (const size of ["full", "mid", "thumb", "public"] as const) {
      const meta = await sharp(out[size]).metadata();
      expect([size, meta.width, meta.height]).toEqual([size, FLAT_SIZES[size].width, FLAT_SIZES[size].height]);
    }
    expect(out.blurhash).toMatch(/^[0-9A-Za-z#$%*+,-.:;=?@[\]^_{|}~]{20,}$/);
    // La pública no es la misma imagen reducida: lleva la marca de agua encima.
    const plain = await sharp(out.full).resize(FLAT_SIZES.public.width, FLAT_SIZES.public.height).png().toBuffer();
    expect(await meanDiff(out.public, plain)).toBeGreaterThan(2);
  }, SLOW);

  it("test_s018_rf4_si_falta_una_imagen_no_se_genera", async () => {
    await expect(flattenCard(config, new Map())).rejects.toMatchObject({ code: "flatten_failed" });
  }, SLOW);
});
