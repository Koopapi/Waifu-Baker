"use server";

import { notFound } from "next/navigation";
import { signIn } from "@/auth";
import { DEMO_USERS, isDemoEnabled, type DemoRole } from "@/domain/demo/mode";

/** Spec 010, RF-13 y RF-14: entra (o cambia) a un papel de la demo con el login de desarrollo, sin Patreon. */
export async function enterDemoAction(role: DemoRole) {
  if (!isDemoEnabled(process.env) || !(role in DEMO_USERS)) notFound();
  await signIn("dev", { name: DEMO_USERS[role].name, admin: role === "admin" ? "on" : undefined, redirectTo: role === "admin" ? "/admin" : "/packs" });
}
