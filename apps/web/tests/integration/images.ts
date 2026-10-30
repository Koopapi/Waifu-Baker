import sharp from "sharp";

/** Imagen de prueba de color liso con un degradado, para que cada una tenga huella distinta. */
export async function testImage(opts: { width?: number; height?: number; hue?: number; format?: "png" | "webp" | "jpeg" | "gif"; cutout?: boolean } = {}) {
  const { width = 832, height = 1216, hue = 200, format = "png", cutout = false } = opts;
  // `cutout`: la figura ocupa el centro y alrededor queda transparente, como una chica recortada (spec 017).
  const rect = cutout ? `<ellipse cx="50%" cy="50%" rx="30%" ry="45%" fill="url(#g)"/>` : `<rect width="100%" height="100%" fill="url(#g)"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},70%,60%)"/><stop offset="1" stop-color="hsl(${(hue + 90) % 360},70%,30%)"/>
    </linearGradient></defs>${rect}</svg>`;
  return sharp(Buffer.from(svg))[format]().toBuffer();
}

export const MIME = { png: "image/png", webp: "image/webp", jpeg: "image/jpeg", gif: "image/gif" } as const;
