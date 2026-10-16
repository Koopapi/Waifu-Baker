"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { deleteTierRule, saveTierRule } from "@/server/services/tiers";
import { getDict } from "@/i18n/server";
import { getPatreonClient } from "@/server/patreon/client-instance";
import { reconcileAll } from "@/server/services/membership";

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

/** Spec 001, RF-17: lanza ahora la revisión de todos los miembros de Patreon. */
export async function reconcileNowAction(): Promise<ActionState> {
  return adminAction("patreonReconcile", ["/admin/tiers", "/admin/users"], async ({ db }) => {
    const r = await reconcileAll(db, getPatreonClient().client);
    return (await getDict()).admin.tiers.synced(r.members, r.granted, r.voided);
  });
}
