// RF-12: reglas para aceptar una imagen subida desde el panel. Función pura, sin E/S.

export const ALLOWED_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MIN_UPLOAD_WIDTH = 600;

export interface UploadCandidate {
  mime: string;
  bytes: number;
  /** Ancho real tras decodificar; null si la imagen no se pudo leer. */
  width: number | null;
}

export type UploadVerdict =
  | { ok: true }
  | { ok: false; code: "unsupported_type" | "too_large" | "too_narrow" | "unreadable"; message: string };

export function validateUpload({ mime, bytes, width }: UploadCandidate): UploadVerdict {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, code: "unsupported_type", message: "Formato no admitido: sube PNG, JPEG o WebP." };
  }
  if (bytes > MAX_UPLOAD_BYTES) {
    return { ok: false, code: "too_large", message: "El archivo supera 20 MB: redúcelo o expórtalo como WebP." };
  }
  if (width === null) {
    return { ok: false, code: "unreadable", message: "No se pudo leer la imagen: el archivo parece dañado." };
  }
  if (width < MIN_UPLOAD_WIDTH) {
    return {
      ok: false,
      code: "too_narrow",
      message: `La imagen mide ${width} px de ancho; el mínimo es ${MIN_UPLOAD_WIDTH} px.`,
    };
  }
  return { ok: true };
}
