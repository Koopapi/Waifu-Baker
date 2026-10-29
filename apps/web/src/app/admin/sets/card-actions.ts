"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { getCardStore } from "@/server/cards/store-instance";
import { bulkUpdateCards, deleteCard, regenerateSet, reorderCards, reviewCard, simulatePack, updateCard, type CardPatch } from "@/server/services/cards";
import { discardPendingLayers } from "@/server/services/card-layers";
import { requireAdmin } from "@/server/auth/require-admin";
import { db } from "@/db/client";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import type { LabCard } from "@/features/opening/fakePack";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { parsePackKind } from "@/domain/catalog/default-odds";

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
    const r = await bulkUpdateCards(db, getCardStore(), actorId, setId, versions, clean);
    const t = (await getDict()).admin.cards;
    return r.layersSealsToReview ? `${t.updated(r.updated)} ${t.layersSealReview(r.layersSealsToReview)}` : t.updated(r.updated);
  });
}

export async function updateCardAction(setId: string, cardId: string, version: number, fd: FormData): Promise<ActionState & { version?: number }> {
  let saved: number | undefined;
  const r = await adminAction("updateCard", paths(setId), async ({ db, actorId }) => {
    const character = String(fd.get("characterId") ?? "");
    const variant = String(fd.get("variant") ?? "");
    const patch: CardPatch = {
      name: String(fd.get("name") ?? ""),
      flavorText: String(fd.get("flavorText") ?? ""),
      characterId: character ? character : null,
    };
    if (fd.has("rarity")) patch.rarity = rarityOf(String(fd.get("rarity")));
    if (variant === "normal" || variant === "holo" || variant === "alt") patch.variant = variant;
    const row = await updateCard(db, getCardStore(), actorId, cardId, version, patch);
    saved = row.version;
    const t = (await getDict()).admin.cards;
    return row.layersSealToReview ? `${t.saved} ${t.layersSealReview(1)}` : t.saved;
  });
  // La versión nueva viaja con la respuesta: el panel no depende de que llegue el refresco.
  return { ...r, version: saved };
}

export async function reorderCardsAction(setId: string, orderedIds: string[]): Promise<ActionState> {
  return adminAction("reorderCards", paths(setId), async ({ db, actorId }) => {
    await reorderCards(db, getCardStore(), actorId, setId, orderedIds);
    return (await getDict()).admin.cards.orderSaved;
  });
}

export async function deleteCardAction(setId: string, cardId: string): Promise<ActionState> {
  return adminAction("deleteCard", paths(setId), async ({ db, actorId }) => {
    await deleteCard(db, getCardStore(), actorId, cardId);
    return (await getDict()).admin.cards.deleted;
  });
}

export async function regenerateSetAction(setId: string): Promise<ActionState> {
  return adminAction("regenerateSet", paths(setId), async ({ db, actorId }) => {
    const n = await regenerateSet(db, getCardStore(), actorId, setId);
    return (await getDict()).admin.cards.regenerated(n);
  });
}

export async function reviewCardAction(setId: string, cardId: string, version: number, reviewed: boolean): Promise<ActionState & { version?: number }> {
  let saved: number | undefined;
  const r = await adminAction("reviewCard", paths(setId), async ({ db, actorId }) => {
    const c = await reviewCard(db, getCardStore(), actorId, cardId, version, reviewed);
    saved = c.version;
    const t = (await getDict()).admin.cards;
    return reviewed ? (c.pendingOriginalKey ? t.reviewedShort : t.reviewedAdult) : t.reviewRemoved;
  });
  return { ...r, version: saved };
}

/** RF-23: sobre simulado con cartas reales; no escribe nada (ni historial). */
export async function simulatePackAction(setId: string, kind?: string): Promise<{ ok: boolean; cards?: LabCard[]; error?: string }> {
  await requireAdmin("action:simulatePack");
  try {
    const pack = await simulatePack(db, setId, parsePackKind(kind));
    const t = await getDict();
    return {
      ok: true,
      cards: pack.map((c) => ({
        id: c.id,
        name: c.name || t.admin.cards.cardN(String(c.number).padStart(3, "0")),
        number: c.number,
        rarity: c.rarity!,
        holo: c.holo,
        image: `/api/admin/assets/${c.keyMid}`,
        framed: true,
        note: c.substitutedFrom ? t.admin.simulate.substituted(t.common.rarity[c.substitutedFrom as Rarity]) : undefined,
      })),
    };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(await getDict(), e) };
    throw e;
  }
}

/** Spec 018, RF-20: descarta el cambio de capas pendiente de revisión 18+. */
export async function discardPendingLayersAction(setId: string, cardId: string, version: number): Promise<ActionState & { version?: number }> {
  let saved: number | undefined;
  const r = await adminAction("discardPendingLayers", paths(setId), async ({ db, actorId }) => {
    const c = await discardPendingLayers(db, getCardStore(), actorId, cardId, { expectedVersion: version });
    saved = c.version;
  });
  return { ...r, version: saved };
}
