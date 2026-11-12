// Dibujo rápido de la imagen fija para los tests que no la miran (spec 018): comprueba que las imágenes se pueden leer y
// devuelve una carta lisa de un color que depende de su contenido (otra carta, otra imagen), sin Chromium. Los tests de la imagen fija (flatten, flat-cards) usan
// el dibujo real.
import { createHash } from "node:crypto";
import sharp from "sharp";
import type { LayersConfig } from "@/domain/cards/layers";
import { AdminError } from "@/server/errors";
import { FLAT_SIZES, flatVariants, type FlatCard } from "@/server/cards/flatten";

export async function fastFlatten(config: LayersConfig, images: Map<string, Buffer>): Promise<FlatCard> {
  for (const body of images.values()) {
    const ok = await sharp(body)
      .metadata()
      .then((m) => Boolean(m.width))
      .catch(() => false);
    if (!ok) throw new AdminError("flatten_failed", "No se pudo generar la imagen de la carta.");
  }
  const h = createHash("sha256").update(JSON.stringify(config));
  for (const body of images.values()) h.update(body);
  const [r, g, b] = h.digest();
  const { width, height } = FLAT_SIZES.full;
  const solid = (c: { r: number; g: number; b: number }) => sharp({ create: { width, height, channels: 4, background: { ...c, alpha: 1 } } }).png({ compressionLevel: 0 }).toBuffer();
  const flat = await flatVariants(await solid({ r, g, b }));
  // Spec 037, RF-11 y RF-15: la versión holo, de otro color (la misma si la carta ya es holo).
  if (config.holo) return { ...flat, holo: "same" };
  // Directa en cada tamaño (sin reducir una imagen grande): así la holo no duplica el tiempo de cada carta de los tests.
  const inv = { r: 255 - r, g: 255 - g, b: 255 - b, alpha: 1 };
  const sized = (size: "mid" | "thumb" | "public") =>
    sharp({ create: { ...FLAT_SIZES[size], channels: 4, background: inv } }).webp({ quality: 50 }).toBuffer();
  const [mid, thumb, pub] = await Promise.all([sized("mid"), sized("thumb"), sized("public")]);
  return { ...flat, holo: { mid, thumb, public: pub } };
}
