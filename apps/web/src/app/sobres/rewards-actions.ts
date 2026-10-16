"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { now } from "@/server/clock";
import { isAdminError } from "@/server/errors";
import { claimDaily, claimFreePack } from "@/server/services/rewards";

export type RewardActionState = { ok: boolean; message?: string; error?: string };

async function run(fn: (userId: string) => Promise<string>): Promise<RewardActionState> {
  const t = await getDict();
  const userId = (await auth())?.user?.id;
  if (!userId) return { ok: false, error: t.common.sessionExpired };
  try {
    const message = await fn(userId);
    revalidatePath("/sobres");
    revalidatePath("/cuenta");
    return { ok: true, message };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(t, e) };
    throw e;
  }
}

/** Spec 009, RF-4: reclamar un sobre gratis de la colección elegida. */
export async function claimFreePackAction(setId: string) {
  return run(async (userId) => {
    await claimFreePack(db, userId, { setId, now: now() });
    return (await getDict()).rewards.free.claimed;
  });
}

/** Spec 009, RF-9: reclamar la recompensa del día con la zona horaria del navegador. */
export async function claimDailyAction(timeZone: string, setId?: string) {
  return run(async (userId) => {
    const r = await claimDaily(db, userId, { now: now(), timeZone, setId });
    const t = (await getDict()).rewards.daily;
    return r.reward.kind === "cookies" ? t.gotCookies(r.reward.amount) : t.gotPack;
  });
}
