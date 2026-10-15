// Monta la portada de Patreon: recorta el fondo blanco de cada personaje y los compone en 4:1.
// Uso: node scripts/make-banner.mjs <carpeta con PNG> <salida sin extensión> <orden de prefijos separados por comas>
import sharp from "sharp";
import { readdirSync } from "node:fs";
import path from "node:path";

const [dir, outBase, orderArg] = process.argv.slice(2);
const W = 3200, H = 800;

/** Fondo blanco → transparente: relleno desde los bordes y nos quedamos con la figura más grande. */
async function cutout(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  const isBg = (i) => Math.min(...px(i)) > 232;
  const bg = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) queue.push(y * w + x);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) queue.push(y * w + x);
  while (queue.length) {
    const i = queue.pop();
    if (bg[i] || !isBg(i)) continue;
    bg[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) queue.push(i - 1);
    if (x < w - 1) queue.push(i + 1);
    if (y > 0) queue.push(i - w);
    if (y < h - 1) queue.push(i + w);
  }
  // Componentes del primer plano: se conserva solo la mayor (quita chispas y firmas sueltas).
  const label = new Int32Array(w * h).fill(-1);
  let best = -1, bestSize = 0, id = 0;
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || label[s] !== -1) continue;
    let size = 0;
    const st = [s];
    label[s] = id;
    while (st.length) {
      const i = st.pop();
      size++;
      const x = i % w, y = (i / w) | 0;
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (n >= 0 && !bg[n] && label[n] === -1) {
          label[n] = id;
          st.push(n);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
    id++;
  }
  // Huecos cerrados de fondo (p. ej. entre brazo y cuerpo): blanco casi puro y de tamaño apreciable.
  // El umbral es estricto para no borrar ropa blanca, que siempre lleva algo de sombreado.
  const hole = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  // Un hueco real está rodeado por el contorno oscuro del dibujo; un brillo, por el color de la tela.
  const pure = (i) => Math.min(...px(i)) >= 251;
  const lum = (i) => 0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2];
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || seen[s] || label[s] !== best || !pure(s)) continue;
    const comp = [];
    const ring = new Set();
    const st = [s];
    seen[s] = 1;
    while (st.length) {
      const i = st.pop();
      comp.push(i);
      const x = i % w, y = (i / w) | 0;
      for (const nb of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (nb < 0 || bg[nb]) continue;
        if (pure(nb)) {
          if (!seen[nb]) {
            seen[nb] = 1;
            st.push(nb);
          }
        } else ring.add(nb);
      }
    }
    if (comp.length < 600) continue;
    let dark = 0;
    for (const r of ring) {
      const x = r % w, y = (r / w) | 0;
      search: for (let k = 1; k <= 4; k++) {
        for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && lum(yy * w + xx) < 110) {
            dark++;
            break search;
          }
        }
      }
    }
    if (dark / ring.size >= 0.8) for (const i of comp) hole[i] = 1;
  }
  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    if (hole[i]) {
      out[i * 4 + 3] = 0;
      continue;
    }
    if (label[i] !== best) {
      out[i * 4 + 3] = 0;
      continue;
    }
    // Borde suave: los píxeles casi blancos junto al fondo se vuelven semitransparentes (sin halo).
    const x = i % w, y = (i / w) | 0;
    const out_ = (j) => bg[j] || hole[j];
    const nearBg = (x > 0 && out_(i - 1)) || (x < w - 1 && out_(i + 1)) || (y > 0 && out_(i - w)) || (y < h - 1 && out_(i + w));
    if (nearBg) out[i * 4 + 3] = Math.max(0, Math.min(255, (255 - Math.min(...px(i))) * 4));
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

function background() {
  const dots = [];
  for (let y = 18; y < H; y += 44) for (let x = (y / 44) % 2 ? 22 : 0; x < W; x += 44) dots.push(`<circle cx="${x}" cy="${y}" r="5"/>`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fc8"/><stop offset="0.55" stop-color="#f064a8"/><stop offset="1" stop-color="#b44be0"/></linearGradient>
      <radialGradient id="v" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2a0b35" stop-opacity="0.45"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g fill="#ffffff" fill-opacity="0.22">${dots.join("")}</g>
    <rect width="100%" height="100%" fill="url(#v)"/>
  </svg>`);
}

const files = readdirSync(dir).filter((f) => f.endsWith(".png") && !f.startsWith("portada"));
const order = orderArg.split(",").map((p) => files.find((f) => f.startsWith(p)));
const n = order.length;
const center = (n - 1) / 2;
const layers = [];
for (const [i, f] of order.entries()) {
  const dist = Math.abs(i - center);
  const h = Math.round(H * (1 - dist * 0.04));
  const img = await sharp(await cutout(path.join(dir, f))).resize({ height: h }).png().toBuffer();
  const { width } = await sharp(img).metadata();
  const step = (W - width) / (n - 1);
  const left = Math.round(i * step);
  // Sombra suave: el contorno desenfocado en un morado oscuro al 40 %.
  const alpha = await sharp(img).extractChannel("alpha").blur(16).linear(0.4, 0).toBuffer();
  const shadowRgba = await sharp({ create: { width, height: h, channels: 3, background: { r: 50, g: 8, b: 60 } } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
  layers.push({ dist, img, left, top: H - h, shadowRgba, width, h });
}
// Las de los extremos detrás; la del centro, delante.
layers.sort((a, b) => b.dist - a.dist);
const comps = [];
for (const l of layers) {
  comps.push({ input: l.shadowRgba, left: l.left, top: l.top });
  comps.push({ input: l.img, left: l.left, top: l.top });
}
const full = await sharp(background()).composite(comps).png().toBuffer();
await sharp(full).toFile(`${outBase}-3200x800.png`);
await sharp(full).resize(1600, 400).png().toFile(`${outBase}-1600x400.png`);
await sharp(full).resize(1600, 400).jpeg({ quality: 90 }).toFile(`${outBase}-1600x400.jpg`);
console.log("portada:", `${outBase}-3200x800.png`, `${outBase}-1600x400.png`, `${outBase}-1600x400.jpg`);
