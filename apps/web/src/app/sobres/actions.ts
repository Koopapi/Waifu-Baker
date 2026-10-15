"use server";

import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { packs } from "@/db/schema";
import { RARITY_LABEL } from "@/domain/catalog/card-rules";
import type { LabCard } from "@/features/opening/fakePack";
import { cardImageUrl } from "@/server/cards/image-urls";
import { isAdminError } from "@/server/errors";
import { openLimiter } from "@/server/rate-limits";
import { ackOpenings, getOpeningResult, openAllPacks, openPack, type OpeningResult } from "@/server/services/packs";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string; code?: string };

async function currentUser() {
  const id = (await auth())?.user?.id;
  return id || null;
}

async function country() {
  return (await headers()).get("cf-ipcountry");
}

const RATE_MSG = "Has abierto muchos sobres en poco tiempo. Espera un minuto y sigue.";

function toLabCards(r: OpeningResult, userId: string): LabCard[] {
  return r.cards.map((c, i) => ({
    id: `${r.packId}-${i}`,
    name: c.name || `Carta ${String(c.number).padStart(3, "0")}`,
    number: c.number,
    rarity: c.rarity,
    holo: c.holo,
    image: cardImageUrl(c.cardId, "mid", userId),
    framed: true,
    note: [c.isNew ? "¡Nueva!" : `Tienes ${c.qtyAfter}`, c.holo ? "versión holo" : null, c.pity ? "garantizada por la protección" : null]
      .filter(Boolean)
      .join(" · "),
  }));
}

function fail(e: unknown): Fail {
  if (isAdminError(e)) return { ok: false, error: e.message, code: e.code };
  throw e;
}

/** RF-5: abre el siguiente sobre sellado de la colección. */
export async function openNextPackAction(setId: string): Promise<Ok<{ packId: string; cards: LabCard[]; remaining: number }> | Fail> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: "Tu sesión ha caducado: vuelve a entrar.", code: "no_session" };
  if (!openLimiter.take(userId)) return { ok: false, error: RATE_MSG, code: "rate_limited" };
  const sealed = await db
    .select({ id: packs.id })
    .from(packs)
    .where(and(eq(packs.userId, userId), eq(packs.setId, setId), eq(packs.status, "sealed")))
    .orderBy(asc(packs.grantedAt));
  if (sealed.length === 0) return { ok: false, error: "No te quedan sobres de esta colección.", code: "no_packs" };
  try {
    const r = await openPack(db, { userId, packId: sealed[0].id, country: await country() });
    return { ok: true, packId: r.packId, cards: toLabCards(r, userId), remaining: sealed.length - 1 };
  } catch (e) {
    return fail(e);
  }
}

/** RF-17: vuelve a mostrar una apertura que no se terminó de ver. */
export async function resumeOpeningAction(packId: string): Promise<Ok<{ packId: string; cards: LabCard[] }> | Fail> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: "Tu sesión ha caducado: vuelve a entrar.", code: "no_session" };
  const r = await getOpeningResult(db, userId, packId);
  if (!r) return { ok: false, error: "Esa apertura no existe.", code: "not_found" };
  return { ok: true, packId, cards: toLabCards(r, userId) };
}

export interface OpenAllCard {
  key: string;
  name: string;
  number: number;
  rarity: LabCard["rarity"];
  rarityLabel: string;
  holo: boolean;
  isNew: boolean;
  qtyAfter: number;
  pity: boolean;
  image: string;
}

/** RF-18 y RF-19: abre hasta 50 sobres de la colección, cada uno con sus reglas. */
export async function openAllPacksAction(setId: string): Promise<Ok<{ packs: number; cards: OpenAllCard[] }> | Fail> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: "Tu sesión ha caducado: vuelve a entrar.", code: "no_session" };
  if (!openLimiter.take(userId)) return { ok: false, error: RATE_MSG, code: "rate_limited" };
  try {
    const results = await openAllPacks(db, { userId, setId, country: await country() });
    await ackOpenings(db, userId, results.map((r) => r.packId));
    return {
      ok: true,
      packs: results.length,
      cards: results.flatMap((r) =>
        r.cards.map((c, i) => ({
          key: `${r.packId}-${i}`,
          name: c.name || `Carta ${String(c.number).padStart(3, "0")}`,
          number: c.number,
          rarity: c.rarity,
          rarityLabel: RARITY_LABEL[c.rarity],
          holo: c.holo,
          isNew: c.isNew,
          qtyAfter: c.qtyAfter,
          pity: c.pity,
          image: cardImageUrl(c.cardId, "mid", userId),
        })),
      ),
    };
  } catch (e) {
    return fail(e);
  }
}

/** El usuario terminó de ver la apertura (RF-17). */
export async function ackOpeningAction(packIds: string[]) {
  const userId = await currentUser();
  if (userId) await ackOpenings(db, userId, packIds);
}
