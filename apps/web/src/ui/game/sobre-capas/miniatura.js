// Spec 030, RF-10 y RF-16: la miniatura plana del sobre cerrado (500 × 875, PNG con transparencia fuera de la silueta),
// con la receta de `creador-sobres.html` del paquete de diseño (docs/FORMATO-DE-DATOS.md, «De registro a imagen»). Solo navegador.
// No lleva partículas, brillo por capa, holo, foil, patrón de los sellos ni el lustre que se mueve.
// Es parte del diseño del sobre del paquete de diseño (sus colores y medidas), por eso va en JavaScript junto a sobre-capas.js.
import { SOBRE_RECURSOS } from "./recursos";

export const MINIATURA = { width: 500, height: 875 };
const H = 1750;
const LINEA = 230;

/** @param {string} src @returns {Promise<HTMLImageElement | null>} */
function imagen(src) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = src;
  });
}

function cubrir(cx, im, x, y, w, h) {
  const k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * k;
  const dh = im.naturalHeight * k;
  cx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function hex(h) {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.replace(/./g, "$&$&");
  const n = parseInt(s.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tono(h, k, haciaBlanco = false) {
  return `rgb(${hex(h)
    .map((v) => Math.round(haciaBlanco ? v + (255 - v) * k : v * (1 - k)))
    .join(",")})`;
}

const safeHex = (c, d) => (typeof c === "string" && /^#[0-9a-fA-F]{3,6}$/.test(c) ? c : d);

/** La familia real de una fuente de `next/font` (variable CSS del layout), con el nombre de Google de respaldo. */
function family(variable, fallback) {
  const v = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

/** Dibuja la miniatura del sobre cerrado; `null` si no se pudo (p. ej. una imagen de otro dominio sin CORS). */
export async function dibujarMiniatura(o, textos = { carta: "carta", cartas: "cartas" }) {
  const MW = MINIATURA.width;
  const MH = MINIATURA.height;
  const v3 = o.vista !== "plano";
  const plastico = Math.max(0, Math.min(1.5, Number(o.plastico ?? 1)));
  const cv = document.createElement("canvas");
  cv.width = MW;
  cv.height = MH;
  const cx = cv.getContext("2d");
  if (!cx) return null;
  const fT = family("--font-dela", '"Dela Gothic One", "Arial Black", sans-serif');
  const fA = family("--font-archivo", 'Archivo, "Arial Black", sans-serif');
  const capas = (o.capas ?? []).filter((c) => c && typeof c.src === "string" && c.visible !== false);
  const logoSrc = o.logo && typeof o.logo === "object" ? o.logo.src : null;
  const [ims, extra] = await Promise.all([
    Promise.all(capas.map((c) => imagen(c.src))),
    Promise.all([imagen(SOBRE_RECURSOS.sombra), imagen(SOBRE_RECURSOS.brillo), imagen(SOBRE_RECURSOS.silueta), logoSrc ? imagen(logoSrc) : Promise.resolve(null)]),
    document.fonts?.load ? Promise.all([document.fonts.load(`40px ${fT}`), document.fonts.load(`italic 900 20px ${fA}`)]).catch(() => null) : null,
  ]);
  cx.fillStyle = "#3B2FC9";
  cx.fillRect(0, 0, MW, MH);
  capas.forEach((c, i) => {
    const im = ims[i];
    if (!im) return;
    const m = Number(c.margen ?? 0) / 100;
    cx.save();
    cx.globalAlpha = c.opacidad == null ? 1 : Number(c.opacidad);
    cx.globalCompositeOperation = c.mezcla && c.mezcla !== "normal" ? c.mezcla : "source-over";
    cubrir(cx, im, -MW * m, -MH * m, MW * (1 + 2 * m), MH * (1 + 2 * m));
    cx.restore();
  });
  // sellos
  const hA = MH * (v3 ? 0.086 : 0.056);
  const hB = MH * (v3 ? 0.072 : 0.056);
  const sellos = [
    [0, hA, safeHex(o.sellos?.arriba, "#FF3EA5")],
    [MH - hB, hB, safeHex(o.sellos?.abajo, "#C6F432")],
  ];
  for (const [y, h, c] of sellos) {
    const gr = cx.createLinearGradient(0, 0, MW, 0);
    gr.addColorStop(0, tono(c, 0.4));
    gr.addColorStop(0.4, c);
    gr.addColorStop(0.52, "#ffffff");
    gr.addColorStop(0.64, tono(c, 0.5, true));
    gr.addColorStop(1, tono(c, 0.4));
    cx.fillStyle = gr;
    cx.fillRect(0, y, MW, h);
    const lz = cx.createLinearGradient(0, y, 0, y + h);
    lz.addColorStop(0, "rgba(255,255,255,.15)");
    lz.addColorStop(0.4, "rgba(255,255,255,.45)");
    lz.addColorStop(1, "rgba(0,0,0,.4)");
    cx.fillStyle = lz;
    cx.fillRect(0, y, MW, h);
  }
  // logo
  const li = extra[3];
  if (logoSrc && li) {
    const bw = MW * 0.88;
    const bh = MH * 0.126;
    const k = Math.min(bw / li.naturalWidth, bh / li.naturalHeight);
    cx.drawImage(li, (MW - li.naturalWidth * k) / 2, MH * 0.1486 + (bh - li.naturalHeight * k) / 2, li.naturalWidth * k, li.naturalHeight * k);
  } else if (o.logo === true || o.logo === undefined) {
    cx.save();
    cx.textAlign = "center";
    cx.textBaseline = "alphabetic";
    cx.lineJoin = "round";
    for (const [txt, size, y] of [["WAIFU", 0.155, MH * 0.2], ["BAKER", 0.12, MH * 0.262]]) {
      cx.font = `${MW * size}px ${fT}`;
      const gr = cx.createLinearGradient(MW * 0.15, 0, MW * 0.85, 0);
      gr.addColorStop(0, "#C6F432");
      gr.addColorStop(0.45, "#ffffff");
      gr.addColorStop(0.6, "#3FE0D0");
      gr.addColorStop(1, "#C6F432");
      cx.fillStyle = "#FF3EA5";
      cx.fillText(txt, MW / 2 + MW * 0.02, y + MW * 0.02);
      cx.lineWidth = MW * 0.009;
      cx.strokeStyle = "#17132B";
      cx.strokeText(txt, MW / 2, y);
      cx.fillStyle = gr;
      cx.fillText(txt, MW / 2, y);
    }
    cx.restore();
  }
  // insignia
  if (o.insignia?.texto) {
    const texto = o.insignia.texto.toUpperCase();
    cx.save();
    cx.translate(MW * 0.78, MH * 0.305);
    cx.rotate((9 * Math.PI) / 180);
    cx.font = `italic 900 ${MW * 0.044}px ${fA}`;
    const tw = cx.measureText(texto).width + MW * 0.06;
    const th = MW * 0.075;
    cx.fillStyle = "#FF3EA5";
    cx.fillRect(-tw / 2 + MW * 0.014, -th / 2 + MW * 0.014, tw, th);
    cx.fillStyle = safeHex(o.insignia.color, "#C6F432");
    cx.fillRect(-tw / 2, -th / 2, tw, th);
    cx.lineWidth = MW * 0.008;
    cx.strokeStyle = "#ffffff";
    cx.strokeRect(-tw / 2, -th / 2, tw, th);
    cx.fillStyle = "#17132B";
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.fillText(texto, 0, 1);
    cx.restore();
  }
  // banda del set
  const nombre = (o.nombre ?? "").trim();
  const codigo = (o.codigo ?? "").trim();
  const cartas = Math.round(Number(o.cartas ?? 0));
  if (nombre || codigo) {
    cx.save();
    cx.translate(MW / 2, MH * 0.8857);
    cx.rotate((-5 * Math.PI) / 180);
    const bh2 = MH * 0.1;
    cx.fillStyle = "#17132B";
    cx.fillRect(-MW * 0.56, -bh2 / 2, MW * 1.12, bh2);
    cx.fillStyle = "#C6F432";
    cx.fillRect(-MW * 0.56, -bh2 / 2, MW * 1.12, MW * 0.01);
    cx.fillRect(-MW * 0.56, bh2 / 2 - MW * 0.01, MW * 1.12, MW * 0.01);
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    if (nombre) {
      cx.font = `${MW * 0.076 * Math.min(1, 17 / nombre.length)}px ${fT}`;
      cx.fillStyle = "#FF3EA5";
      cx.fillText(nombre, MW * 0.008, -bh2 * 0.14 + MW * 0.008);
      cx.fillStyle = "#ffffff";
      cx.fillText(nombre, 0, -bh2 * 0.14);
    }
    cx.font = `italic 900 ${MW * 0.039}px ${fA}`;
    cx.fillStyle = "#ffffff";
    cx.fillText(`${codigo ? `${codigo}   ` : ""}${cartas ? `${cartas} ${cartas === 1 ? textos.carta : textos.cartas}` : ""}`, 0, bh2 * 0.26);
    cx.restore();
  }
  // plástico
  if (v3) {
    cx.save();
    cx.globalAlpha = Math.min(1, 0.9 * plastico);
    if (extra[0]) cx.drawImage(extra[0], 0, 0, MW, MH);
    cx.globalAlpha = Math.min(1, 0.92 * plastico);
    if (extra[1]) cx.drawImage(extra[1], 0, 0, MW, MH);
    cx.restore();
  }
  // línea de rasgado
  cx.save();
  cx.setLineDash([MW * 0.022, MW * 0.014]);
  cx.lineWidth = MW * 0.007;
  cx.strokeStyle = "rgba(255,255,255,.95)";
  cx.beginPath();
  cx.moveTo(MW * 0.03, (MH * LINEA) / H);
  cx.lineTo(MW * 0.97, (MH * LINEA) / H);
  cx.stroke();
  cx.restore();
  // silueta
  cx.globalCompositeOperation = "destination-in";
  if (v3 && extra[2]) cx.drawImage(extra[2], 0, 0, MW, MH);
  else {
    const D = 16;
    const t = (MH * 60) / H;
    cx.beginPath();
    for (let i = 0; i <= D * 2; i++) cx.lineTo((i / (D * 2)) * MW, i % 2 ? 0 : t);
    for (let j = D * 2; j >= 0; j--) cx.lineTo((j / (D * 2)) * MW, j % 2 ? MH : MH - t);
    cx.closePath();
    cx.fill();
  }
  try {
    return await new Promise((ok) => cv.toBlob(ok, "image/png"));
  } catch {
    return null;
  }
}
