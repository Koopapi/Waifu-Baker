"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { safeNext } from "@/domain/legal/documents";
import { getDict } from "@/i18n/server";
import { acceptTerms } from "@/server/services/legal";

/** Spec 007, RF-1: confirmar 16+ y aceptar los términos, y volver a donde iba. */
export async function acceptTermsAction(_: { error?: string } | null, form: FormData) {
  const t = await getDict();
  const userId = (await auth())?.user?.id;
  if (!userId) redirect(`/login?next=${encodeURIComponent("/bienvenida")}`);
  if (form.get("age") !== "on" || form.get("terms") !== "on") return { error: t.legal.gate.required };
  await acceptTerms(db, userId);
  redirect(safeNext(String(form.get("next") ?? "")));
}
