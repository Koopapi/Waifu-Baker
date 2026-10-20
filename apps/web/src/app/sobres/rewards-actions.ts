"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { now } from "@/server/clock";
import { isAdminError } from "@/server/errors";
import { claimDaily, claimFreePack } from "@/server/services/rewards";

/** Spec 015, RF-1 y RF-2: la acción devuelve el premio y el cliente lo anima (el servidor decide, el cliente anima). */
export type RewardOutcome =
  | { kind: "cookies"; amount: number; cookies: number; day: number }
  | { kind: "pack"; setId: string; cookies: number | null; day: number | null };
export type RewardActionState = { ok: true; reward: RewardOutcome } | { ok: false; error: string };

async function run(fn: (userId: string) => Promise<RewardOutcome>): Promise<RewardActionState> {
  const t = await getDict();
  const userId = (await auth())?.user?.id;
  if (!userId) return { ok: false, error: t.common.sessionExpired };
  try {
    const reward = await fn(userId);
    revalidatePath("/sobres");
    revalidatePath("/recompensas");
    revalidatePath("/cuenta");
    return { ok: true, reward };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(t, e) };
    throw e;
  }
}

/** Spec 009, RF-4: reclamar un sobre gratis de la colección elegida. */
export async function claimFreePackAction(setId: string) {
  return run(async (userId) => {
    const r = await claimFreePack(db, userId, { setId, now: now() });
    return { kind: "pack", setId: r.setId, cookies: null, day: null };
  });
}

/** Spec 009, RF-9: reclamar la recompensa del día con la zona horaria del navegador. */
export async function claimDailyAction(timeZone: string, setId?: string) {
  return run(async (userId) => {
    const r = await claimDaily(db, userId, { now: now(), timeZone, setId });
    return r.reward.kind === "cookies"
      ? { kind: "cookies", amount: r.reward.amount, cookies: r.cookies, day: r.day }
      : { kind: "pack", setId: setId ?? "", cookies: r.cookies, day: r.day };
  });
}
