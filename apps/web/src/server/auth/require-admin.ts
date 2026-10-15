import "server-only";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { checkAdminAccess } from "@/server/services/admin-guard";

/** RF-1/RF-2 para páginas y server actions: 404 si no es administrador. */
export async function requireAdmin(path: string) {
  const session = await auth();
  const ok = await checkAdminAccess(db, session?.user?.id || null, path);
  if (!ok || !session) notFound();
  return session;
}
