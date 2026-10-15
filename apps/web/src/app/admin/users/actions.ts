"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { giftPacks } from "@/server/services/users-admin";

export async function giftPacksAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const userId = String(fd.get("userId"));
  return adminAction("giftPacks", [`/admin/users/${userId}`], async ({ db, actorId }) => {
    const n = await giftPacks(db, actorId, {
      userId,
      setId: String(fd.get("setId") ?? ""),
      count: Number(fd.get("count")),
      reason: String(fd.get("reason") ?? ""),
    });
    return `${n} sobre(s) regalado(s).`;
  });
}
