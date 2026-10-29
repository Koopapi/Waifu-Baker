"use server";

// Spec 024, RF-14 a RF-19: los pasos del acceso del equipo. Cada paso devuelve solo un estado; los secretos (cookie del
// paso, códigos) nunca vuelven al navegador salvo el enlace del bot.
import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { db } from "@/db/client";
import { AdminCodeError, signIn } from "@/auth";
import { ADMIN_STEP_COOKIE, ADMIN_STEP_MAX_AGE } from "@/server/auth/admin-step";
import { getTelegram } from "@/server/adapters/telegram";
import { now } from "@/server/clock";
import { changeAdminPassword, checkTelegramLink, resendAdminCode, startAdminLogin } from "@/server/services/admin-accounts";

export type StepState = { status: string; next?: "change" | "link" | "code"; linkUrl?: string };

async function pending() {
  return (await cookies()).get(ADMIN_STEP_COOKIE)?.value ?? "";
}

async function keep(value: string) {
  (await cookies()).set(ADMIN_STEP_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_STEP_MAX_AGE,
  });
}

export async function passwordStep(username: string, password: string): Promise<StepState> {
  const r = await startAdminLogin(db, getTelegram(), { username: String(username).slice(0, 64), password: String(password).slice(0, 200), now: now() });
  if (r.status !== "ok") return { status: r.status };
  await keep(r.pending);
  return { status: "ok", next: r.next, linkUrl: r.linkUrl };
}

export async function changeStep(newPassword: string): Promise<StepState> {
  const r = await changeAdminPassword(db, getTelegram(), { pending: await pending(), newPassword: String(newPassword).slice(0, 200), now: now() });
  if (r.status !== "ok") return { status: r.status };
  return { status: "ok", next: r.next, linkUrl: r.linkUrl };
}

export async function linkStep(): Promise<StepState> {
  const r = await checkTelegramLink(db, getTelegram(), { pending: await pending(), now: now() });
  return r.status === "ok" ? { status: "ok", next: "code" } : { status: r.status };
}

export async function resendStep(): Promise<StepState> {
  return resendAdminCode(db, getTelegram(), { pending: await pending(), now: now() });
}

/** El último paso abre la sesión (Auth.js comprueba el código) y lleva al panel. */
export async function codeStep(code: string): Promise<StepState> {
  try {
    await signIn("admin", { code: String(code).slice(0, 12), redirectTo: "/admin" });
  } catch (e) {
    if (e instanceof AdminCodeError) return { status: e.reason };
    if (e instanceof AuthError) return { status: "invalid" };
    throw e; // la redirección al panel
  }
  return { status: "ok" };
}
