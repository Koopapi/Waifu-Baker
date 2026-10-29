"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { getDict } from "@/i18n/server";
import { setMinAge } from "@/server/services/settings";

/** Spec 010, RF-17: cambia la edad mínima de la web (16 o 18). */
export async function setMinAgeAction(age: number): Promise<ActionState> {
  return adminAction("setMinAge", ["/admin/settings"], async ({ db, actorId }) => {
    await setMinAge(db, actorId, age);
    return (await getDict()).admin.settings.minAge.saved(age);
  });
}
