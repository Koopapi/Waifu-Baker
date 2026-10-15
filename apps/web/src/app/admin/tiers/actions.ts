"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { deleteTierRule, saveTierRule } from "@/server/services/tiers";
import { getDict } from "@/i18n/server";

export async function saveTierRuleAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("saveTierRule", ["/admin/tiers"], async ({ db, actorId }) => {
    await saveTierRule(db, actorId, {
      patreonTierId: String(fd.get("patreonTierId") ?? ""),
      tierName: String(fd.get("tierName") ?? ""),
      setId: String(fd.get("setId") ?? ""),
      packsPerMonth: Number(fd.get("packsPerMonth")),
      active: fd.get("active") === "on",
    });
    return (await getDict()).admin.tiers.saved;
  });
}

export async function deleteTierRuleAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("deleteTierRule", ["/admin/tiers"], async ({ db, actorId }) => {
    await deleteTierRule(db, actorId, String(fd.get("ruleId")));
    return (await getDict()).admin.tiers.deleted;
  });
}
