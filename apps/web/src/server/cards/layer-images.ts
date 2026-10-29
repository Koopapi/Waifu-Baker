import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { checkLayerSize, SEAL_MAX_WIDTH, STORED_LAYER } from "@/domain/cards/layers";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/domain/catalog/upload-rules";
import type { CardStore } from "@/server/ports/card-store";
import { AdminError } from "@/server/errors";
import type { UploadFile } from "@/server/services/cards";

export type LayerUploadKind = "layer" | "seal";

export interface StagedLayerImage {
  /** Clave en el área temporal (`tmp/layers/<uuid>.webp`); al guardar la carta pasa a la colección. */
  key: string;
  width: number;
  height: number;
  /** La capa tenía la proporción del lienzo con otro tamaño y se escaló (RF-34). */
  scaled: boolean;
}

/**
 * Spec 016, RF-19 a RF-21 y RF-23: valida una imagen de capa o de sello, la deja en WebP optimizado y la guarda en el
 * área temporal. Las capas se escalan al lienzo (1400 × 1982); el sello no sigue la proporción y se limita a 600 px.
 */
export async function stageLayerImage(store: CardStore, file: UploadFile, kind: LayerUploadKind): Promise<StagedLayerImage> {
  const { body, ...rest } = await prepareLayerImage(file, kind);
  const key = `tmp/layers/${randomUUID()}.webp`;
  await store.put(key, body);
  return { key, ...rest };
}

/** La imagen de capa o de sello validada y en WebP, lista para guardar (spec 017: también los fondos de la biblioteca). */
export async function prepareLayerImage(file: UploadFile, kind: LayerUploadKind): Promise<Omit<StagedLayerImage, "key"> & { body: Buffer }> {
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.mime)) {
    throw new AdminError("unsupported_type", "Formato no admitido: sube PNG, JPEG o WebP.");
  }
  if (file.body.length > MAX_UPLOAD_BYTES) {
    throw new AdminError("too_large", "El archivo supera 20 MB: redúcelo o expórtalo como WebP.", { maxMb: MAX_UPLOAD_BYTES / 1024 / 1024 });
  }
  let meta: Metadata;
  try {
    meta = await sharp(file.body).metadata();
  } catch {
    throw new AdminError("unreadable", "No se pudo leer la imagen: el archivo parece dañado.");
  }
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new AdminError("unreadable", "No se pudo leer la imagen: el archivo parece dañado.");

  let out: Buffer;
  let scaled = false;
  if (kind === "layer") {
    const verdict = checkLayerSize(width, height);
    if (!verdict.ok) {
      throw verdict.code === "layer_too_narrow"
        ? new AdminError("layer_too_narrow", `La capa mide ${width} px de ancho; el mínimo es ${verdict.min} px.`, { width, min: verdict.min })
        : new AdminError("layer_ratio", `La capa mide ${width} × ${height}; debe tener la proporción del lienzo (${verdict.expected}).`, { width, height, expected: verdict.expected });
    }
    scaled = verdict.scaled;
    out = await sharp(file.body).rotate().resize(STORED_LAYER.width, STORED_LAYER.height, { fit: "fill" }).webp({ quality: 90, alphaQuality: 90 }).toBuffer();
  } else {
    out = await sharp(file.body).rotate().resize({ width: Math.min(width, SEAL_MAX_WIDTH), withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 90 }).toBuffer();
  }
  const stored = await sharp(out).metadata();
  return { body: out, width: stored.width ?? 0, height: stored.height ?? 0, scaled };
}

/** Spec 016 (RNF): lo que lleva más de 24 h en el área temporal no se guardó nunca; se borra. Devuelve cuántas. */
export const TEMP_LAYER_TTL_MS = 24 * 60 * 60 * 1000;
export async function purgeTempLayers(store: CardStore, now: Date): Promise<number> {
  const stale = (await store.list("tmp/layers")).filter((f) => now.getTime() - f.modifiedAt.getTime() > TEMP_LAYER_TTL_MS);
  for (const f of stale) await store.delete(f.key);
  return stale.length;
}
