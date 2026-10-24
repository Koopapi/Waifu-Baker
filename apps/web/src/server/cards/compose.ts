import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { encode } from "blurhash";
import type { Rarity } from "@/domain/catalog/card-rules";

// RF-16: compone la carta a partir del arte con el marco de su rareza (diseñado en Pencil),
// sin textos: solo el número en la pastilla, en Space Grotesk.

export const CARD_SIZES = {
  full: { width: 1500, height: 2100 },
  mid: { width: 750, height: 1050 },
  thumb: { width: 300, height: 420 },
  public: { width: 600, height: 840 },
} as const;
export type CardSize = keyof typeof CARD_SIZES;

export const RARITY_COLOR: Record<Rarity | "none", string> = {
  common: "#9aa0a6",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#f5c451",
  secret: "#ff6ad5",
  none: "#6b7079",
};

/** Lo que se ve en la carta: el marco depende de la rareza y solo se escribe el número. */
export interface CardFace {
  number: number;
  rarity: Rarity | null;
  setCode: string;
}

const W = CARD_SIZES.full.width;
const H = CARD_SIZES.full.height;
const RADIUS = 68; // 34 px en el diseño a 750

const ASSETS = path.resolve(process.cwd(), "assets");
const FONT_FILE = path.join(ASSETS, "fonts/SpaceGrotesk.ttf");
// Fontconfig se inicializa en el primer texto; con esto no busca (ni avisa por) la config del sistema.
process.env.FONTCONFIG_FILE ??= path.join(ASSETS, "fonts/fonts.conf");

// Marcos diseñados en Pencil (`Waifu Baker/waifubaker.pen`, lámina «Cartas · Marco por rareza"),
// exportados a 1500×2100 con la ventana de arte transparente. Se cargan una vez por proceso.
const frameCache = new Map<string, Promise<Buffer>>();
function frameFor(rarity: Rarity | null) {
  const key = rarity ?? "none";
  if (!frameCache.has(key)) {
    frameCache.set(
      key,
      readFile(path.join(ASSETS, `frames/frame_${key}.png`)).then((b) => sharp(b).resize(W, H).png().toBuffer()),
    );
  }
  return frameCache.get(key)!;
}

const pango = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Pastilla de numeración del diseño en Pencil (x 636, y 978, 76 × 34 a 750 px), multiplicada por 2. */
const NUMBER_PILL = { left: 1272, top: 1956, width: 152, height: 68, size: 30, weight: "SemiBold" };

async function renderText(text: string, size: number, weight: string, color: string, letterSpacing = 0) {
  return sharp({
    text: {
      text: `<span foreground="${color}" letter_spacing="${Math.round(letterSpacing * 1024)}">${pango(text)}</span>`,
      font: `Space Grotesk ${weight} ${size}`,
      fontfile: FONT_FILE,
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
}

/** Número de tres cifras centrado en la pastilla. */
async function numberLayer(n: number) {
  const r = await renderText(String(n).padStart(3, "0"), NUMBER_PILL.size, NUMBER_PILL.weight, "#F6F3FB", 3);
  return {
    data: r.data,
    left: NUMBER_PILL.left + Math.round((NUMBER_PILL.width - r.info.width) / 2),
    top: NUMBER_PILL.top + Math.round((NUMBER_PILL.height - r.info.height) / 2),
  };
}

const roundMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${RADIUS}" fill="#fff"/></svg>`,
);

export function watermarkSvg(w: number, h: number) {
  const rows = Array.from({ length: 9 }, (_, i) => {
    const y = 60 + i * 100;
    const x = i % 2 ? -40 : 20;
    return `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="26" fill="#fff" fill-opacity="0.22" transform="rotate(-24 ${w / 2} ${h / 2})">WAIFU BAKER · MUESTRA · WAIFU BAKER · MUESTRA</text>`;
  }).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rows}</svg>`);
}

export interface ComposedCard {
  full: Buffer;
  mid: Buffer;
  thumb: Buffer;
  public: Buffer;
  blurhash: string;
}

export async function composeCard(art: Buffer, face: CardFace): Promise<ComposedCard> {
  const [frame, numberImg] = await Promise.all([frameFor(face.rarity), numberLayer(face.number)]);
  const base = await sharp(art)
    .rotate()
    .resize(W, H, { fit: "cover", position: sharp.strategy.attention })
    .ensureAlpha()
    .png()
    .toBuffer();
  const full = await sharp(base)
    .composite([
      { input: frame },
      { input: numberImg.data, left: numberImg.left, top: numberImg.top },
      { input: roundMask, blend: "dest-in" },
    ])
    .webp({ quality: 88, alphaQuality: 90 })
    .toBuffer();

  const resized = (size: CardSize, quality: number) =>
    sharp(full).resize(CARD_SIZES[size].width, CARD_SIZES[size].height).webp({ quality }).toBuffer();
  const pub = CARD_SIZES.public;
  const [mid, thumb, publicImg, raw] = await Promise.all([
    resized("mid", 86),
    resized("thumb", 80),
    sharp(full)
      .resize(pub.width, pub.height)
      .composite([{ input: watermarkSvg(pub.width, pub.height) }])
      .webp({ quality: 70 })
      .toBuffer(),
    sharp(full).resize(32, 45, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const blurhash = encode(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height, 4, 3);
  return { full, mid, thumb, public: publicImg, blurhash };
}
