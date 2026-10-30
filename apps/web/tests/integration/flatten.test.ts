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
    // Esquinas redondeadas: transparentes (el suavizado de Linux deja un alfa mínimo); el centro, opaco.
    expect((await pixel(png, 0, 0))[3]).toBeLessThan(8);
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

  it("test_s018_rf1_rf15_salen_los_tamanos_y_la_publica_lleva_marca_de_agua", async () => {
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

  // Spec 025, RF-5: la imagen fija incluye el brillo de capa en reposo, la intensidad del holo y el marco personalizado.
  it("test_s025_rf2_rf5_el_brillo_de_capa_sale_solo_sobre_la_chica", async () => {
    const imgs = await images();
    const glossy: LayersConfig = { ...config, capas: config.capas.map((l) => ("key" in l && l.rol === "personaje" ? { ...l, brillo: { tipo: "holo" as const, intensidad: 1 } } : l)) };
    const [plain, shiny] = [await flattenCard(config, imgs), await flattenCard(glossy, imgs)];
    const delta = (a: number[], b: number[]) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    // Centro: la chica, con brillo. Arriba a la izquierda: solo fondo, igual que antes.
    expect(delta(await pixel(plain, 700, 991), await pixel(shiny, 700, 991))).toBeGreaterThan(20);
    expect(delta(await pixel(plain, 250, 400), await pixel(shiny, 250, 400))).toBeLessThan(4);
  }, SLOW);

  it("test_s025_rf3_rf5_la_intensidad_del_holo_cambia_la_imagen_fija", async () => {
    const imgs = await images();
    const [weak, strong] = [await flattenCard({ ...config, holo: true, holoIntensidad: 0 }, imgs), await flattenCard({ ...config, holo: true, holoIntensidad: 1 }, imgs)];
    expect(await meanDiff(weak, strong)).toBeGreaterThan(3);
  }, SLOW);

  it("test_s025_rf18_el_marco_personalizado_sale_con_sus_colores_y_sin_marco_no_hay_borde", async () => {
    const imgs = await images();
    const green = await flattenCard({ ...config, marco: "personalizado", marcoColores: { color: "#10c040", brillo: "#10c040" } }, imgs);
    const [r, g, b] = await pixel(green, 12, 991);
    expect(g).toBeGreaterThan(r + 40);
    expect(g).toBeGreaterThan(b + 40);
    // Sin marco, en ese punto se ve el arte (el fondo rojo de prueba), no un borde.
    const bare = await flattenCard({ ...config, marco: "ninguno" }, imgs);
    const [r2, g2] = await pixel(bare, 40, 991);
    expect(r2).toBeGreaterThan(g2);
  }, SLOW);
});
