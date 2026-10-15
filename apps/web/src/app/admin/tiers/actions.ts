"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { deleteTierRule, saveTierRule } from "@/server/services/tiers";

export async function saveTierRuleAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("saveTierRule", ["/admin/tiers"], async ({ db, actorId }) => {
    await saveTierRule(db, actorId, {
      patreonTierId: String(fd.get("patreonTierId") ?? ""),
      tierName: String(fd.get("tierName") ?? ""),
      setId: String(fd.get("setId") ?? ""),
      packsPerMonth: Number(fd.get("packsPerMonth")),
      active: fd.get("active") === "on",
    });
    return "Regla guardada. Se aplicará desde el siguiente cobro de cada miembro.";
  });
}

export async function deleteTierRuleAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("deleteTierRule", ["/admin/tiers"], async ({ db, actorId }) => {
    await deleteTierRule(db, actorId, String(fd.get("ruleId")));
    return "Regla eliminada.";
  });
}
