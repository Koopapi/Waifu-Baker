"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, normalizeLocale } from "./locales";

/** RF-3 y RF-4: guarda el idioma elegido durante un año. */
export async function setLocaleAction(value: string) {
  (await cookies()).set(LOCALE_COOKIE, normalizeLocale(value), { maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax", path: "/" });
}
