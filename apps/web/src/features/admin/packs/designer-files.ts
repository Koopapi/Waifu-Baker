// Spec 030: lo que el editor de sobres sabe de cada imagen (medidas y lectura de píxeles en el navegador, RF-9).
import { analyzePixels, type ImageFacts } from "@/domain/packs/editor";

export interface DesignFile extends ImageFacts {
  /** Enlace para la vista previa: `blob:` de lo recién añadido o el del panel para lo guardado. */
  url: string;
  name: string;
  /** El archivo aún sin guardar (se manda al guardar). */
  file?: File;
}

export const ACCEPTED = ["image/png", "image/jpeg", "image/webp"] as const;
export const isAccepted = (f: File) => (ACCEPTED as readonly string[]).includes(f.type);

function load(url: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = url;
  });
}

/** RF-9: medidas y, en una copia de 250 px de ancho, si tiene transparencia y si algo cruza la línea de rasgado. */
export async function inspect(url: string): Promise<Pick<DesignFile, "width" | "height" | "analysis"> | null> {
  const im = await load(url);
  if (!im) return null;
  const width = im.naturalWidth;
  const height = im.naturalHeight;
  try {
    const w = 250;
    const h = Math.max(1, Math.round((250 * height) / width));
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const cx = cv.getContext("2d");
    if (!cx) throw new Error("sin canvas");
    cx.drawImage(im, 0, 0, w, h);
    return { width, height, analysis: analyzePixels(cx.getImageData(0, 0, w, h).data, w, h) };
  } catch {
    return { width, height, analysis: { error: true } };
  }
}
