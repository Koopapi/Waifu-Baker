"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { getCardStore } from "@/server/cards/store-instance";
import { bulkUpdateCards, deleteCard, regenerateSet, reorderCards, reviewCard, simulatePack, updateCard, type CardPatch } from "@/server/services/cards";
import { requireAdmin } from "@/server/auth/require-admin";
import { db } from "@/db/client";
import { isAdminError } from "@/server/errors";
import type { LabCard } from "@/features/opening/fakePack";
import { RARITIES, RARITY_LABEL, type Rarity } from "@/domain/catalog/card-rules";

const paths = (setId: string) => [`/admin/sets/${setId}`, "/admin/sets", "/admin"];
const rarityOf = (v: unknown): Rarity | null | undefined =>
  v === "" || v === "__none" ? null : RARITIES.includes(v as Rarity) ? (v as Rarity) : undefined;

export async function bulkUpdateCardsAction(
  setId: string,
  versions: Record<string, number>,
  patch: { characterId?: string; rarity?: string; variant?: string },
): Promise<ActionState> {
  return adminAction("bulkUpdateCards", paths(setId), async ({ db, actorId }) => {
    const clean: Pick<CardPatch, "characterId" | "rarity" | "variant"> = {};
    if (patch.characterId !== undefined) clean.characterId = patch.characterId === "__none" ? null : patch.characterId;
    if (patch.rarity !== undefined) clean.rarity = rarityOf(patch.rarity);
    if (patch.variant === "normal" || patch.variant === "holo" || patch.variant === "alt") clean.variant = patch.variant;
    const n = await bulkUpdateCards(db, getCardStore(), actorId, setId, versions, clean);
    return `${n} carta(s) actualizada(s).`;
  });
}

export async function updateCardAction(setId: string, cardId: string, version: number, fd: FormData): Promise<ActionState> {
  return adminAction("updateCard", paths(setId), async ({ db, actorId }) => {
    const character = String(fd.get("characterId") ?? "");
    const variant = String(fd.get("variant") ?? "");
    const patch: CardPatch = {
      name: String(fd.get("name") ?? ""),
      flavorText: String(fd.get("flavorText") ?? ""),
      characterId: character ? character : null,
    };
    if (fd.has("rarity")) patch.rarity = rarityOf(String(fd.get("rarity")));
    if (variant === "normal" || variant === "holo" || variant === "alt") patch.variant = variant;
    await updateCard(db, getCardStore(), actorId, cardId, version, patch);
    return "Carta guardada.";
  });
}

export async function reorderCardsAction(setId: string, orderedIds: string[]): Promise<ActionState> {
  return adminAction("reorderCards", paths(setId), async ({ db, actorId }) => {
    await reorderCards(db, getCardStore(), actorId, setId, orderedIds);
    return "Orden guardado.";
  });
}

export async function deleteCardAction(setId: string, cardId: string): Promise<ActionState> {
  return adminAction("deleteCard", paths(setId), async ({ db, actorId }) => {
    await deleteCard(db, getCardStore(), actorId, cardId);
    return "Carta eliminada.";
  });
}

export async function regenerateSetAction(setId: string): Promise<ActionState> {
  return adminAction("regenerateSet", paths(setId), async ({ db, actorId }) => {
    const n = await regenerateSet(db, getCardStore(), actorId, setId);
    return `${n} carta(s) regenerada(s) con el marco actual.`;
  });
}

export async function reviewCardAction(setId: string, cardId: string, version: number, reviewed: boolean): Promise<ActionState> {
  return adminAction("reviewCard", paths(setId), async ({ db, actorId }) => {
    const c = await reviewCard(db, getCardStore(), actorId, cardId, version, reviewed);
    return reviewed ? (c.pendingOriginalKey ? "Revisada." : "Carta revisada: personaje claramente adulto.") : "Revisión retirada.";
  });
}

/** RF-23: sobre simulado con cartas reales; no escribe nada (ni historial). */
export async function simulatePackAction(setId: string): Promise<{ ok: boolean; cards?: LabCard[]; error?: string }> {
  await requireAdmin("action:simulatePack");
  try {
    const pack = await simulatePack(db, setId);
    return {
      ok: true,
      cards: pack.map((c) => ({
        id: c.id,
        name: c.name || `Carta ${String(c.number).padStart(3, "0")}`,
        number: c.number,
        rarity: c.rarity!,
        holo: c.holo,
        image: `/api/admin/assets/${c.keyMid}`,
        framed: true,
        note: c.substitutedFrom ? `Salió ${RARITY_LABEL[c.substitutedFrom as Rarity]}, pero aún no hay cartas de esa rareza` : undefined,
      })),
    };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: e.message };
    throw e;
  }
}
