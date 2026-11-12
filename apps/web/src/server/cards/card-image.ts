// Spec 037, RF-7 a RF-9 y RF-12 a RF-14: la imagen fija que pide una vista para una copia de una carta.
import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { cards, userCards } from "@/db/schema";
import { flatImageFor } from "@/domain/cards/flat-image";
import type { DbLike } from "@/server/db-types";
import { cardImageUrl } from "./image-urls";

export interface CardImage {
  src: string;
  /** La copia es holo y la carta aún no tiene imagen holo: la vista pone su acabado holo (RF-19, RF-20). */
  holoFinish: boolean;
}

/** Enlace firmado a la imagen fija (normal u holo) de una copia. */
export function cardImage(cardId: string, size: "thumb" | "mid", userId: string, copy: { holoCopy: boolean; holoImage: boolean }, now = Date.now()): CardImage {
  const c = flatImageFor(size, copy);
  return { src: cardImageUrl(cardId, c.size, userId, now), holoFinish: c.holoFinish };
}

/** Las cartas (de la lista) que ya tienen imagen fija holo. */
export async function holoImageIds(db: DbLike, cardIds: readonly string[]): Promise<Set<string>> {
  if (cardIds.length === 0) return new Set();
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(inArray(cards.id, [...new Set(cardIds)]), isNotNull(cards.keyHoloThumb)));
  return new Set(rows.map((r) => r.id));
}

/** Las cartas (de la lista) de las que el usuario tiene al menos una copia holo. */
export async function ownedHoloIds(db: DbLike, userId: string, cardIds: readonly string[]): Promise<Set<string>> {
  if (cardIds.length === 0) return new Set();
  const rows = await db
    .select({ id: userCards.cardId })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.holo, true), inArray(userCards.cardId, [...new Set(cardIds)])));
  return new Set(rows.map((r) => r.id));
}
