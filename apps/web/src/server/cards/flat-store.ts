// Spec 018, RF-1 a RF-4: genera la imagen fija de una carta por capas y la guarda en sus cuatro tamaños.
import { createHash } from "node:crypto";
import { imageKeys, type LayersConfig } from "@/domain/cards/layers";
import type { CardStore } from "@/server/ports/card-store";
import { AdminError } from "@/server/errors";
import { renderFlatCard, type FlatCard } from "./flatten";

/** Quien dibuja la imagen fija: Chromium con carta-capas.js; los tests pueden poner uno rápido (puerto inyectable). */
export type Flattener = (config: LayersConfig, images: Map<string, Buffer>) => Promise<FlatCard>;
let flattener: Flattener = renderFlatCard;

/** Solo para tests: sustituye el dibujo (con `null`, vuelve al real). */
export function setFlattener(f: Flattener | null) {
  flattener = f ?? renderFlatCard;
}

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** El contenido de cada imagen de la configuración (capas y sello); si falta alguna, `flatten_failed`. */
export async function loadLayerImages(store: CardStore, config: LayersConfig): Promise<Map<string, Buffer>> {
  const images = new Map<string, Buffer>();
  for (const key of new Set(imageKeys(config))) {
    const file = await store.get(key);
    if (!file) throw new AdminError("flatten_failed", "No se pudo generar la imagen de la carta: falta una de sus capas.");
    images.set(key, file.body);
  }
  return images;
}

/** Dibuja la carta armada (RF-1); si no se puede, lanza `flatten_failed` (RF-4). */
export async function renderCardFlat(store: CardStore, config: LayersConfig): Promise<FlatCard> {
  return flattener(config, await loadLayerImages(store, config));
}

/** Guarda los cuatro tamaños con la huella en la clave (como las compuestas) y devuelve las columnas de la carta. */
export async function storeFlat(store: CardStore, card: { id: string; setId: string }, flat: FlatCard) {
  const tag = sha256(flat.full).slice(0, 10);
  const keys = {
    keyFull: `sets/${card.setId}/cards/${card.id}/full.${tag}.webp`,
    keyMid: `sets/${card.setId}/cards/${card.id}/mid.${tag}.webp`,
    keyThumb: `sets/${card.setId}/cards/${card.id}/thumb.${tag}.webp`,
    keyPublic: `sets/${card.setId}/cards/${card.id}/public.${tag}.webp`,
  };
  await Promise.all([store.put(keys.keyFull, flat.full), store.put(keys.keyMid, flat.mid), store.put(keys.keyThumb, flat.thumb), store.put(keys.keyPublic, flat.public)]);
  return { ...keys, blurhash: flat.blurhash };
}
