// Spec 018, RF-6, RF-7, RF-16 y RF-17: la carta viva del coleccionista. Las capas solo para quien tiene la carta, con
// enlaces firmados que caducan y, en las colecciones 18+, con el doble control de edad. Nunca lo pendiente de revisión.
import { and, eq } from "drizzle-orm";
import { cards, sets, userCards, users } from "@/db/schema";
import { imageKeys, type LayersConfig } from "@/domain/cards/layers";
import { finalCardConfig } from "@/domain/cards/final-card";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import type { LiveCard } from "@/domain/cards/live";
import { verifyLayer } from "@/domain/signed-url";
import { cardLayerUrl, imageSecret } from "@/server/cards/image-urls";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { applyBondEffects } from "@/domain/bonds/effects";
import { bondLevelsOf } from "./bonds";


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
  // Spec 034, RF-9: también las comunes se ven vivas (antes, spec 022, RF-4, planas); quien las arma decide cuánto se
  // mueven. RF-1 a RF-5: la misma preparación que la vista previa del armador.
  if (!card?.layers) return null;
  const config = finalCardConfig(card.layers, (key) => cardLayerUrl(cardId, key, userId, now));
  // Spec 029, RF-9 a RF-11 y RF-13: los efectos del vínculo del dueño con el personaje de la carta (solo los ve él).
  const level = card.characterId ? ((await bondLevelsOf(db, userId, [card.characterId])).get(card.characterId) ?? 1) : 1;
  return { tier: rarityTier(card.rarity), config: applyBondEffects(config, level) };
}

/** RF-16: la imagen de una capa con su enlace firmado; `null` si el enlace no vale o la capa no es de la carta. */
export async function serveLiveLayer(db: DbLike, store: CardStore, userId: string, grant: { cardId: string; key: string; expires: number; sig: string }, now = Date.now()) {
  if (!verifyLayer({ ...grant, userId }, imageSecret(), now)) return null;
  const card = await visibleCard(db, userId, grant.cardId);
  if (!card || !imageKeys(card.layers as LayersConfig).includes(grant.key)) return null;
  return store.get(grant.key);
}
