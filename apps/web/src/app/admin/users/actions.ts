"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { now } from "@/server/clock";
import { adjustCookies } from "@/server/services/rewards";
import { giftPacks } from "@/server/services/users-admin";
import { getDict } from "@/i18n/server";

export async function giftPacksAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const userId = String(fd.get("userId"));
  return adminAction("giftPacks", [`/admin/users/${userId}`], async ({ db, actorId }) => {
    const n = await giftPacks(db, actorId, {
      userId,
      setId: String(fd.get("setId") ?? ""),
      count: Number(fd.get("count")),
      reason: String(fd.get("reason") ?? ""),
    });
    return (await getDict()).admin.users.gifted(n);
  });
}

/** Spec 009, RF-21: dar o quitar galletas con un motivo. */
export async function adjustCookiesAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const userId = String(fd.get("userId"));
  return adminAction("adjustCookies", [`/admin/users/${userId}`], async ({ db, actorId }) => {
    const balance = await adjustCookies(db, actorId, { userId, amount: Number(fd.get("amount")), reason: String(fd.get("reason") ?? ""), now: now() });
    return (await getDict()).admin.users.rewards.adjusted(balance);
  });
}
