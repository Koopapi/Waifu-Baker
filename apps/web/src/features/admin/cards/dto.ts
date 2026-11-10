// Spec 027: la carta tal como la ve la ventana del panel, construida igual desde la página y desde el guardado único.
import type { cards } from "@/db/schema";
import { isAssembled } from "@/domain/cards/layers";
import { assetUrl, TILE_FIELDS, type CardDTO, type CardTileDTO } from "./types";

type Row = typeof cards.$inferSelect;

export function toCardDTO(c: Row, extra: { characterName: string | null; chance: number }): CardDTO {
  return {
    id: c.id,
    number: c.number,
    name: c.name,
    flavorText: c.flavorText,
    rarity: c.rarity,
    variant: c.variant,
    characterId: c.characterId,
    characterName: extra.characterName,
    status: c.status,
    version: c.version,
    thumbUrl: assetUrl(c.keyThumb),
    midUrl: assetUrl(c.keyMid),
    fullUrl: assetUrl(c.keyFull),
    adultReviewedAt: c.adultReviewedAt ? c.adultReviewedAt.toISOString() : null,
    pendingArtUrl: assetUrl(c.pendingOriginalKey),
    pendingLayersUrl: assetUrl(c.pendingKeys?.mid ?? null),
    chance: extra.chance,
    // Spec 018, RF-18: el editor trabaja sobre el cambio pendiente de revisión, si lo hay.
    layers: c.layersPending ?? c.layers,
    hasOriginal: Boolean(c.originalKey),
  };
}

/** Spec 031, RF-2: la carta tal como la ve la cuadrícula (solo los campos de `TILE_FIELDS`). */
export function toCardTile(c: CardDTO): CardTileDTO {
  return { ...(Object.fromEntries(TILE_FIELDS.map((k) => [k, c[k]])) as Omit<CardTileDTO, "assembled">), assembled: isAssembled(c.layers) };
}
