"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { db } from "@/db/client";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { deactivateAccount, declareAdult } from "@/server/services/account";

export type AccountActionState = { ok: boolean; message?: string; error?: string } | null;

/** Spec 001, RF-18: declarar la edad con un tier adulto activo. */
export async function declareAdultAction(_: AccountActionState, form: FormData): Promise<AccountActionState> {
  const t = await getDict();
  const userId = (await auth())?.user?.id;
  if (!userId) return { ok: false, error: t.common.sessionExpired };
  if (form.get("confirm") !== "on") return { ok: false, error: t.account.adult.confirm };
  try {
    await declareAdult(db, userId);
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(t, e) };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: t.account.adult.done };
}

/** Spec 001, RF-22: desactivar la cuenta y cerrar la sesión. */
export async function deactivateAccountAction() {
  const userId = (await auth())?.user?.id;
  if (userId) await deactivateAccount(db, userId);
  await signOut({ redirectTo: "/" });
}
