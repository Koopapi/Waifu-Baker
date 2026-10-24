// Spec 018, RF-1 a RF-4: la imagen fija de una carta armada. Se saca del mismo carta-capas.js en un Chromium sin
// ventana (decisión del dueño, 23 oct 2026): así queda igual que la carta viva en reposo y sigue sus cambios solo.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { encode } from "blurhash";
import sharp from "sharp";
import { chromium, type Browser } from "playwright-core";
import { imageKeys, isImageLayer, isImageSeal, type LayersConfig } from "@/domain/cards/layers";
import { AdminError } from "@/server/errors";
import { watermarkSvg } from "./compose";

/** Tamaños de la imagen fija: la proporción del lienzo (700 × 991), la grande a 2×. */
export const FLAT_SIZES = {
  full: { width: 1400, height: 1982 },
  mid: { width: 700, height: 991 },
  thumb: { width: 300, height: 425 },
  public: { width: 600, height: 849 },
} as const;
export type FlatSize = keyof typeof FLAT_SIZES;

export interface FlatCard {
  full: Buffer;
  mid: Buffer;
  thumb: Buffer;
  public: Buffer;
  blurhash: string;
}

// Un navegador por proceso: se abre al primer uso y se reutiliza (abrirlo cuesta ~1 s; cada carta, una página nueva).
let browser: Promise<Browser> | null = null;
function getBrowser() {
  browser ??= chromium.launch({ args: ["--disable-gpu", "--font-render-hinting=none"] }).catch((e) => {
    browser = null;
    throw e;
  });
  return browser;
}

/** Cierra el navegador (tests y apagado del proceso). */
export async function closeFlattenBrowser() {
  const b = browser;
  browser = null;
  if (b) await (await b).close().catch(() => {});
}

let script: Promise<string> | null = null;
const cartaCapasSource = () => (script ??= readFile(path.join(process.cwd(), "src/ui/game/carta-capas/carta-capas.js"), "utf8"));

/**
 * Página de la foto: sin aura ni sombra fuera de la carta y con el sello dentro del borde (en la carta viva sobresale; en
 * una imagen fija se cortaría). El movimiento reducido deja las partículas quietas en su sitio (misma semilla).
 */
const PAGE_CSS = `
html,body{margin:0;background:transparent}
#carta{width:700px}
.cc-in{box-shadow:none!important}
.cc-sello[data-esquina="sup-izq"],.cc-sello-texto[data-esquina="sup-izq"]{left:3%!important;top:2.5%!important}
.cc-sello[data-esquina="sup-der"],.cc-sello-texto[data-esquina="sup-der"]{right:3%!important;top:2.5%!important}
.cc-sello[data-esquina="inf-izq"],.cc-sello-texto[data-esquina="inf-izq"]{left:3%!important;bottom:2.5%!important}
.cc-sello[data-esquina="inf-der"],.cc-sello-texto[data-esquina="inf-der"]{right:3%!important;bottom:2.5%!important}
`;

const dataUrl = (body: Buffer) => `data:image/webp;base64,${body.toString("base64")}`;

/**
 * RF-1: la carta armada en reposo como PNG de 1400 × 1982 con las esquinas transparentes. `images` trae el contenido de
 * cada clave de imagen de la configuración. RF-4: si falta una imagen o la foto falla, `flatten_failed`.
 */
export async function flattenCard(config: LayersConfig, images: Map<string, Buffer>, opts: { holo?: boolean } = {}): Promise<Buffer> {
  const missing = imageKeys(config).filter((k) => !images.has(k));
  if (missing.length) throw new AdminError("flatten_failed", "No se pudo generar la imagen de la carta: falta una de sus capas.");
  const capas = config.capas.map((l) => (isImageLayer(l) ? { ...l, src: dataUrl(images.get(l.key)!) } : l));
  const sello = isImageSeal(config.sello) ? { ...config.sello, src: dataUrl(images.get(config.sello.key)!) } : config.sello;
  const cfg = { ...config, capas, sello, holo: Boolean(opts.holo || config.holo), aparecer: false, reposo: false, etiqueta: "carta" };

  let page;
  try {
    const b = await getBrowser();
    page = await b.newPage({ viewport: { width: 760, height: 1080 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${PAGE_CSS}</style></head><body><div id="carta"></div></body></html>`);
    await page.addScriptTag({ content: await cartaCapasSource() });
    await page.evaluate(async (c) => {
      const api = (window as unknown as { CartaCapas: { montar: (el: HTMLElement, c: unknown) => { listo: Promise<void> } } }).CartaCapas;
      await api.montar(document.getElementById("carta")!, c).listo;
    }, cfg);
    const shot = await page.locator("#carta").screenshot({ omitBackground: true, animations: "disabled", timeout: 15_000 });
    return await sharp(shot).resize(FLAT_SIZES.full.width, FLAT_SIZES.full.height, { fit: "fill" }).png().toBuffer();
  } catch (e) {
    throw new AdminError("flatten_failed", "No se pudo generar la imagen de la carta.", { reason: (e as Error).message.slice(0, 120) });
  } finally {
    await page?.close().catch(() => {});
  }
}

/** RF-1, RF-2 y RF-15: la imagen fija en todos sus tamaños (la pública, con marca de agua) y su blurhash. */
export async function renderFlatCard(config: LayersConfig, images: Map<string, Buffer>, opts: { holo?: boolean } = {}): Promise<FlatCard> {
  const png = await flattenCard(config, images, opts);
  const full = await sharp(png).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
  const resized = (size: FlatSize, quality: number) => sharp(png).resize(FLAT_SIZES[size].width, FLAT_SIZES[size].height).webp({ quality }).toBuffer();
  const pub = FLAT_SIZES.public;
  const [mid, thumb, publicImg, raw] = await Promise.all([
    resized("mid", 86),
    resized("thumb", 80),
    sharp(png)
      .resize(pub.width, pub.height)
      .composite([{ input: watermarkSvg(pub.width, pub.height) }])
      .webp({ quality: 70 })
      .toBuffer(),
    sharp(png).resize(32, 45, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const blurhash = encode(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height, 4, 3);
  return { full, mid, thumb, public: publicImg, blurhash };
}
