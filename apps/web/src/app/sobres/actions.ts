"use server";

import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { packs } from "@/db/schema";
import type { LabCard } from "@/features/opening/fakePack";
import { cardImageUrl } from "@/server/cards/image-urls";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import type { Dict } from "@/i18n";
import { isAdminError } from "@/server/errors";
import { openLimiter } from "@/server/rate-limits";
import { ackOpenings, getOpeningResult, openAllPacks, openPack, type OpeningResult } from "@/server/services/packs";
import { liveCardConfig } from "@/server/services/live-card";
import type { LiveCard } from "@/domain/cards/live";
import { highlights } from "@/domain/opening/open-all";
import { parsePackKind } from "@/domain/catalog/default-odds";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string; code?: string };

async function currentUser() {
  const id = (await auth())?.user?.id;
  return id || null;
}

async function country() {
  return (await headers()).get("cf-ipcountry");
}

/** Spec 018, RF-6: cada carta va con su carta viva (el usuario acaba de recibirla) para montarla al revelarla. */
async function toLabCards(t: Dict, r: OpeningResult, userId: string): Promise<LabCard[]> {
  const lives = await Promise.all(r.cards.map((c) => liveCardConfig(db, userId, c.cardId)));
  return r.cards.map((c, i) => ({
    id: `${r.packId}-${i}`,
    name: c.name || t.packs.actions.cardFallback(String(c.number).padStart(3, "0")),
    number: c.number,
    rarity: c.rarity,
    holo: c.holo,
    image: cardImageUrl(c.cardId, "mid", userId),
    framed: true,
    live: lives[i],
    note: [c.isNew ? t.packs.notes.isNew : t.packs.notes.owned(c.qtyAfter), c.holo ? t.packs.notes.holo : null, c.pity ? t.packs.notes.pity : null]
      .filter(Boolean)
      .join(" · "),
  }));
}

async function fail(e: unknown): Promise<Fail> {
  if (isAdminError(e)) return { ok: false, error: translateError(await getDict(), e), code: e.code };
  throw e;
}

/** RF-5: abre el siguiente sobre sellado de la colección y del tipo pedido (spec 022, RF-19). */
export async function openNextPackAction(setId: string, kindParam?: string): Promise<Ok<{ packId: string; cards: LabCard[]; remaining: number }> | Fail> {
  const userId = await currentUser();
  const t = await getDict();
  if (!userId) return { ok: false, error: t.common.sessionExpired, code: "no_session" };
  if (!openLimiter.take(userId)) return { ok: false, error: t.packs.actions.rateLimited, code: "rate_limited" };
  const sealed = await db
    .select({ id: packs.id })
    .from(packs)
    .where(and(eq(packs.userId, userId), eq(packs.setId, setId), eq(packs.kind, parsePackKind(kindParam)), eq(packs.status, "sealed")))
    .orderBy(asc(packs.grantedAt));
  if (sealed.length === 0) return { ok: false, error: t.packs.actions.noPacks, code: "no_packs" };
  try {
    const r = await openPack(db, { userId, packId: sealed[0].id, country: await country() });
    return { ok: true, packId: r.packId, cards: await toLabCards(t, r, userId), remaining: sealed.length - 1 };
  } catch (e) {
    return fail(e);
  }
}

/** RF-17: vuelve a mostrar una apertura que no se terminó de ver. */
export async function resumeOpeningAction(packId: string): Promise<Ok<{ packId: string; cards: LabCard[] }> | Fail> {
  const userId = await currentUser();
  const t = await getDict();
  if (!userId) return { ok: false, error: t.common.sessionExpired, code: "no_session" };
  const r = await getOpeningResult(db, userId, packId);
  if (!r) return { ok: false, error: t.packs.actions.openingNotFound, code: "not_found" };
  return { ok: true, packId, cards: await toLabCards(t, r, userId) };
}

export interface OpenAllCard {
  key: string;
  name: string;
  number: number;
  rarity: LabCard["rarity"];
  holo: boolean;
  isNew: boolean;
  qtyAfter: number;
  pity: boolean;
  image: string;
  /** Spec 019, RF-1: de qué sobre del lote salió (0 = el primero), para la ráfaga. */
  pack: number;
  /** Spec 019, RF-6: la carta viva, solo en las destacadas del foco. */
  live?: LiveCard | null;
}

/** RF-18 y RF-19: abre hasta 50 sobres de la colección y del tipo pedido, cada uno con sus reglas. */
export async function openAllPacksAction(setId: string, kindParam?: string): Promise<Ok<{ packs: number; cards: OpenAllCard[] }> | Fail> {
  const userId = await currentUser();
  const t = await getDict();
  if (!userId) return { ok: false, error: t.common.sessionExpired, code: "no_session" };
  if (!openLimiter.take(userId)) return { ok: false, error: t.packs.actions.rateLimited, code: "rate_limited" };
  try {
    const results = await openAllPacks(db, { userId, setId, kind: parsePackKind(kindParam), country: await country() });
    await ackOpenings(db, userId, results.map((r) => r.packId));
    const cardIds = new Map<string, string>();
    const cards: OpenAllCard[] = results.flatMap((r, pack) =>
      r.cards.map((c, i) => {
        cardIds.set(`${r.packId}-${i}`, c.cardId);
        return {
          key: `${r.packId}-${i}`,
          name: c.name || t.packs.actions.cardFallback(String(c.number).padStart(3, "0")),
          number: c.number,
          rarity: c.rarity,
          holo: c.holo,
          isNew: c.isNew,
          qtyAfter: c.qtyAfter,
          pity: c.pity,
          image: cardImageUrl(c.cardId, "mid", userId),
          pack,
        };
      }),
    );
    // Spec 019, RF-6: solo las destacadas (como mucho 10) llevan su carta viva.
    const featured = highlights(cards);
    const lives = await Promise.all(featured.map((c) => liveCardConfig(db, userId, cardIds.get(c.key)!)));
    const liveByKey = new Map(featured.map((c, i) => [c.key, lives[i]]));
    return { ok: true, packs: results.length, cards: cards.map((c) => ({ ...c, live: liveByKey.get(c.key) })) };
  } catch (e) {
    return fail(e);
  }
}

/** El usuario terminó de ver la apertura (RF-17). */
export async function ackOpeningAction(packIds: string[]) {
  const userId = await currentUser();
  if (userId) await ackOpenings(db, userId, packIds);
}
