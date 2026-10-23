import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { CHARACTER_TYPES, checkCharacterSize, STORED_LAYER } from "@/domain/cards/layers";
import { MAX_UPLOAD_BYTES } from "@/domain/catalog/upload-rules";
import type { CardStore } from "@/server/ports/card-store";
import { AdminError } from "@/server/errors";
import type { UploadFile } from "@/server/services/cards";
import type { StagedLayerImage } from "./layer-images";

export interface StagedCharacterImage extends StagedLayerImage {
  /** RF-3: la imagen no tiene ninguna zona transparente; parece no estar recortada (solo es un aviso). */
  uncut: boolean;
}

export interface PreparedCharacterImage extends Omit<StagedCharacterImage, "key"> {
  /** La imagen en WebP, lista para guardar. */
  body: Buffer;
}

/** Alfa a partir del cual un píxel cuenta como opaco: el borde de un recorte siempre baja de aquí. */
const OPAQUE_ALPHA = 250;

/** Spec 017, RF-3: «sin recortar» = sin canal alfa o sin ningún píxel con alfa por debajo de 250. */
export async function looksUncut(body: Buffer): Promise<boolean> {
  const image = sharp(body);
  if (!(await image.metadata()).hasAlpha) return true;
  const { channels } = await image.stats();
  return (channels[3]?.min ?? 255) >= OPAQUE_ALPHA;
}

/**
 * Spec 017, RF-2 y RF-3: valida la imagen de la chica (PNG o WebP, hasta 20 MB, al menos 991 px de alto) y la deja en
 * WebP con su transparencia y sin pasar del alto del lienzo doble (1982 px).
 */
export async function prepareCharacterImage(file: UploadFile): Promise<PreparedCharacterImage> {
  if (!(CHARACTER_TYPES as readonly string[]).includes(file.mime)) {
    throw new AdminError("character_type", "La chica debe subirse en PNG o WebP (con transparencia).");
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
  const verdict = checkCharacterSize(width, height);
  if (!verdict.ok) throw new AdminError("character_too_short", `La imagen mide ${height} px de alto; el mínimo es ${verdict.min} px.`, { height, min: verdict.min });

  const out = await sharp(file.body).rotate().resize({ height: STORED_LAYER.height, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 90 }).toBuffer();
  const stored = await sharp(out).metadata();
  return { body: out, width: stored.width ?? 0, height: stored.height ?? 0, scaled: height > STORED_LAYER.height, uncut: await looksUncut(file.body) };
}

/** La imagen de la chica, preparada y guardada en el área temporal de capas (para sustituirla desde el editor). */
export async function stageCharacterImage(store: CardStore, file: UploadFile): Promise<StagedCharacterImage> {
  const { body, ...rest } = await prepareCharacterImage(file);
  const key = `tmp/layers/${randomUUID()}.webp`;
  await store.put(key, body);
  return { key, ...rest };
}
