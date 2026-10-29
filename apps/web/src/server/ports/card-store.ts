/** Almacenamiento de imágenes de cartas (originales y compuestas). Ninguna clave es pública. */
export interface CardStore {
  put(key: string, body: Buffer): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /** Spec 016: claves bajo un prefijo con su fecha de modificación (para limpiar el área temporal). */
  list(prefix: string): Promise<{ key: string; modifiedAt: Date }[]>;
}

export const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function contentTypeFor(key: string) {
  return CONTENT_TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}
