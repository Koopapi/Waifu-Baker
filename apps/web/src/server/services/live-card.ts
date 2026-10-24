// Spec 018, RF-6, RF-7, RF-16 y RF-17: la carta viva del coleccionista. Las capas solo para quien tiene la carta, con
// enlaces firmados que caducan y, en las colecciones 18+, con el doble control de edad. Nunca lo pendiente de revisión.
import { and, eq } from "drizzle-orm";
import { cards, sets, userCards, users } from "@/db/schema";
import { imageKeys, isImageLayer, isImageSeal, type LayersConfig } from "@/domain/cards/layers";
import { rarityTier, type RarityTier } from "@/domain/catalog/rarity-tier";
import { verifyLayer } from "@/domain/signed-url";
import { cardLayerUrl, imageSecret } from "@/server/cards/image-urls";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";

/** La configuración tal como la monta carta-capas.js en el navegador: enlaces en vez de claves del almacén. */
export interface LiveCard {
  tier: RarityTier;
  config: Omit<LayersConfig, "capas" | "sello"> & { capas: Record<string, unknown>[]; sello: Record<string, unknown> | null };
}

/** La carta, si el usuario la tiene y puede verla (18+: declaración y tier adulto verificados). */
async function visibleCard(db: DbLike, userId: string, cardId: string) {
  const [row] = await db
    .select({ card: cards, isAdult: sets.isAdult })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
    .limit(1);
  if (!row?.card.layers) return null;
  if (row.isAdult) {
    const [u] = await db.select({ declared: users.isAdultDeclared, verified: users.adultVerifiedAt }).from(users).where(eq(users.id, userId));
    if (!(u?.declared && u.verified)) return null;
  }
  return row.card;
}

/** RF-16 y RF-17: la configuración vigente de la carta con enlaces firmados; `null` si no la tiene o no puede verla. */
export async function liveCardConfig(db: DbLike, userId: string, cardId: string, now = Date.now()): Promise<LiveCard | null> {
  const card = await visibleCard(db, userId, cardId);
  if (!card?.layers) return null;
  const url = (key: string) => cardLayerUrl(cardId, key, userId, now);
  const capas = card.layers.capas.map((l) => {
    if (!isImageLayer(l)) return { ...l };
    const { key, ...rest } = l;
    return { ...rest, src: url(key) };
  });
  let sello: Record<string, unknown> | null = card.layers.sello ? { ...card.layers.sello } : null;
  if (isImageSeal(card.layers.sello)) {
    const { key, ...rest } = card.layers.sello;
    sello = { ...rest, src: url(key) };
  }
  return { tier: rarityTier(card.rarity), config: { ...card.layers, capas, sello } };
}

/** RF-16: la imagen de una capa con su enlace firmado; `null` si el enlace no vale o la capa no es de la carta. */
export async function serveLiveLayer(db: DbLike, store: CardStore, userId: string, grant: { cardId: string; key: string; expires: number; sig: string }, now = Date.now()) {
  if (!verifyLayer({ ...grant, userId }, imageSecret(), now)) return null;
  const card = await visibleCard(db, userId, grant.cardId);
  if (!card || !imageKeys(card.layers as LayersConfig).includes(grant.key)) return null;
  return store.get(grant.key);
}
