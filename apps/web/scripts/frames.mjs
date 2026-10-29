// Spec 022, RF-9: dibuja los marcos de las cinco rarezas de la maqueta aprobada en Pencil (`waifubaker.pen`, lámina
// «Rarezas y sobres plata y gold (spec 022)») a 1500 × 2100 con la ventana del arte transparente.
// Uso: node scripts/frames.mjs  (escribe assets/frames/frame_<rareza>.png; el de «none» no cambia).
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.FONTCONFIG_FILE ??= path.join(ROOT, "assets/fonts/fonts.conf");

const W = 1500;
const H = 2100;
const RADIUS = 68;
// La maqueta mide 210 px de ancho: todo se multiplica por 1500 / 210.
const K = W / 210;

// [degradado del borde, grosor del borde en la maqueta, línea interior, tinta, texto del sello, efectos]
const FRAMES = {
  common: [{ angle: 180, stops: [["#C9CED6", 0], ["#8E949E", 1]] }, 4, "#E3E6E9", "#4B5157", "C", 0],
  rare: [{ angle: 135, stops: [["#9FD3FF", 0], ["#3B82F6", 1]] }, 6, "#DBEAFE", "#1D4ED8", "R", 0],
  epic: [{ angle: 135, stops: [["#E9B8FF", 0], ["#8B3FD9", 1]] }, 7, "#F5D0FE", "#6B21A8", "E", 1],
  legendary: [{ angle: 135, stops: [["#FFF1A8", 0], ["#F5C451", 0.45], ["#B7791F", 1]] }, 9, "#FFF4C2", "#A16207", "LEG", 2],
  ex: [{ conic: ["#FF7EB6", "#B79CFF", "#7CC8FF", "#7EF0C9", "#FF7EB6"] }, 10, "#FFFFFF", "#7C3AED", "EX", 2],
};

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

/** El relleno del borde: degradado lineal en SVG o cónico (EX) calculado píxel a píxel. */
async function fill(spec) {
  if (spec.conic) {
    const cols = spec.conic.map(hex);
    const buf = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = ((Math.atan2(y - H / 2, x - W / 2) / (2 * Math.PI) + 1.25) % 1) * (cols.length - 1);
        const i = Math.min(Math.floor(t), cols.length - 2);
        const f = t - i;
        const o = (y * W + x) * 3;
        for (let c = 0; c < 3; c++) buf[o + c] = Math.round(cols[i][c] * (1 - f) + cols[i + 1][c] * f);
      }
    }
    return sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  }
  const a = (spec.angle * Math.PI) / 180;
  // Ángulo como en CSS/Pencil: 180 = de arriba abajo, 135 = de arriba a la izquierda hacia abajo a la derecha.
  const dx = Math.sin(a) / 2;
  const dy = -Math.cos(a) / 2;
  const stops = spec.stops.map(([c, p]) => `<stop offset="${p}" stop-color="${c}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="${0.5 - dx}" y1="${0.5 - dy}" x2="${0.5 + dx}" y2="${0.5 + dy}">${stops}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const star = (cx, cy, s, color) => {
  const p = (x, y) => `${(cx + ((x - 7) * s) / 14).toFixed(1)},${(cy + ((y - 7) * s) / 14).toFixed(1)}`;
  return `<polygon points="${[p(7, 0), p(9, 5), p(14, 7), p(9, 9), p(7, 14), p(5, 9), p(0, 7), p(5, 5)].join(" ")}" fill="${color}"/>`;
};

async function frame(name) {
  const [spec, bwDesign, inner, ink, sealText, fx] = FRAMES[name];
  const bw = Math.round(bwDesign * K);
  const r2 = Math.max(RADIUS - bw / 2, 24);
  const ring = `<path fill-rule="evenodd" fill="#fff" d="M${RADIUS},0 H${W - RADIUS} A${RADIUS},${RADIUS} 0 0 1 ${W},${RADIUS} V${H - RADIUS} A${RADIUS},${RADIUS} 0 0 1 ${W - RADIUS},${H} H${RADIUS} A${RADIUS},${RADIUS} 0 0 1 0,${H - RADIUS} V${RADIUS} A${RADIUS},${RADIUS} 0 0 1 ${RADIUS},0 Z M${bw + r2},${bw} H${W - bw - r2} A${r2},${r2} 0 0 1 ${W - bw},${bw + r2} V${H - bw - r2} A${r2},${r2} 0 0 1 ${W - bw - r2},${H - bw} H${bw + r2} A${r2},${r2} 0 0 1 ${bw},${H - bw - r2} V${bw + r2} A${r2},${r2} 0 0 1 ${bw + r2},${bw} Z"/>`;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${ring}</svg>`);
  const border = await sharp(await fill(spec)).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();

  // Sello de rareza arriba a la izquierda (pastilla con la línea interior de relleno y la tinta de borde y texto).
  const sealH = 118;
  const sealW = 70 + sealText.length * 58;
  const sealX = 108;
  const sealY = 104;
  const sw = Math.round(1.5 * K);
  const parts = [
    // Línea interior alrededor de la ventana del arte.
    `<rect x="${bw + sw / 2}" y="${bw + sw / 2}" width="${W - 2 * bw - sw}" height="${H - 2 * bw - sw}" rx="${r2}" fill="none" stroke="${inner}" stroke-width="${sw}"/>`,
    `<rect x="${sealX}" y="${sealY}" width="${sealW}" height="${sealH}" rx="${sealH / 2}" fill="${inner}" stroke="${ink}" stroke-width="${sw}"/>`,
    `<text x="${sealX + sealW / 2}" y="${sealY + sealH / 2 + 29}" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="84" letter-spacing="2" fill="${ink}">${sealText}</text>`,
    // Símbolo de la colección (arriba a la derecha) y pastilla del número (abajo a la derecha), como en los marcos de la spec 003.
    `<circle cx="1330" cy="160" r="56" fill="#0E0B18" stroke="${inner}" stroke-width="8"/>`,
    `<text x="1330" y="176" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="44" letter-spacing="2" fill="#F6F3FB">WB</text>`,
    `<rect x="1242" y="1956" width="152" height="68" rx="34" fill="#0E0B18" stroke="${inner}" stroke-width="6"/>`,
  ];
  // Épica, legendaria y EX: destellos; legendaria y EX además gemas en las esquinas.
  if (fx >= 1) {
    const c = name === "legendary" ? "#FFF1A8" : "#FFFFFF";
    parts.push(star(170 * K, 37 * K, 14 * K, c), star(33 * K, 255 * K, 10 * K, c), star(186 * K, 236 * K, 12 * K, c));
  }
  if (fx >= 2) {
    const g = name === "ex" ? "#FFFFFF" : "#FFF1A8";
    for (const [x, y] of [[54, 54], [W - 54, 54], [54, H - 54], [W - 54, H - 54]]) parts.push(`<circle cx="${x}" cy="${y}" r="36" fill="${g}" stroke="${ink}" stroke-width="14"/>`);
  }
  const deco = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${parts.join("")}</svg>`);
  const out = path.join(ROOT, `assets/frames/frame_${name}.png`);
  await sharp(border).composite([{ input: deco }]).png({ compressionLevel: 9 }).toFile(out);
  return out;
}

for (const name of Object.keys(FRAMES)) console.log(await frame(name));
