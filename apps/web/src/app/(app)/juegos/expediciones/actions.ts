"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db/client";
import type { ExpeditionResult } from "@/db/schema";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { now } from "@/server/clock";
import { isAdminError } from "@/server/errors";
import { cancelExpedition, choosePackSet, claimExpedition, sendExpedition, unlockZone, type CardChoice } from "@/server/services/expeditions";

export type ExpeditionActionState<T = null> = { ok: true; value: T } | { ok: false; error: string };

/** El servidor decide; la acción devuelve lo decidido o el error traducido (spec 020). */
async function run<T>(fn: (userId: string) => Promise<T>): Promise<ExpeditionActionState<T>> {
  const t = await getDict();
  const userId = (await auth())?.user?.id;
  if (!userId) return { ok: false, error: t.common.sessionExpired };
  try {
    const value = await fn(userId);
    revalidatePath("/juegos", "layout");
    return { ok: true, value };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(t, e) };
    throw e;
  }
}

/** RF-15: manda un equipo a una zona. */
export async function sendExpeditionAction(input: { zoneId: string; durationMin: number; cards: CardChoice[] }) {
  return run(async (userId) => {
    const e = await sendExpedition(db, userId, input, now());
    return { id: e.id };
  });
}

/** RF-18: cancela una expedición en curso. */
export async function cancelExpeditionAction(id: string) {
  return run(async (userId) => {
    await cancelExpedition(db, userId, id, now());
    return null;
  });
}

/** RF-19 a RF-24: reclama una expedición que volvió y devuelve el reporte. */
export async function claimExpeditionAction(id: string): Promise<ExpeditionActionState<ExpeditionResult>> {
  const r = await run(async (userId) => (await claimExpedition(db, userId, id, now())).result);
  if (r.ok) revalidatePath("/sobres");
  return r;
}

/** RF-22: elige la colección del sobre ganado. */
export async function choosePackSetAction(expeditionId: string, setId: string) {
  const r = await run(async (userId) => ({ packId: await choosePackSet(db, userId, expeditionId, setId, now()) }));
  if (r.ok) revalidatePath("/sobres");
  return r;
}

/** RF-5: abre una zona con niebla. */
export async function unlockZoneAction(zoneId: string) {
  return run(async (userId) => unlockZone(db, userId, zoneId, now()));
}
