"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { craftCard, previewRecycle, recycle, type RecycleTarget } from "@/server/services/bonds";
import type { RecyclePlan } from "@/domain/bonds/recycle";

export type BondActionState<T> = { ok: true; value: T } | { ok: false; error: string };

async function run<T>(fn: (userId: string) => Promise<T>, revalidate = true): Promise<BondActionState<T>> {
  const t = await getDict();
  const userId = (await auth())?.user?.id;
  if (!userId) return { ok: false, error: t.common.sessionExpired };
  try {
    const value = await fn(userId);
    if (revalidate) {
      revalidatePath("/collection", "layout");
    }
    return { ok: true, value };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(t, e) };
    throw e;
  }
}

function cleanTarget(target: RecycleTarget): RecycleTarget {
  if ("characterId" in target) return { characterId: String(target.characterId) };
  return { cardId: String(target.cardId), holo: Boolean(target.holo) };
}

/** Spec 029, RF-4: lo que dará reciclar, para la confirmación (el servidor lo calcula). */
export async function previewRecycleAction(target: RecycleTarget): Promise<BondActionState<RecyclePlan>> {
  return run((u) => previewRecycle(db, u, cleanTarget(target)), false);
}

/** Spec 029, RF-1 a RF-7: recicla una versión de una carta o todas las repetidas del personaje. */
export async function recycleAction(target: RecycleTarget): Promise<BondActionState<RecyclePlan>> {
  return run((u) => recycle(db, u, cleanTarget(target)));
}

/** Spec 029, RF-18 a RF-21: fabrica una copia normal de una carta con polvo. */
export async function craftAction(cardId: string): Promise<BondActionState<{ cost: number; dust: number }>> {
  return run(async (u) => {
    const r = await craftCard(db, u, String(cardId));
    return { cost: r.cost, dust: r.dust };
  });
}
