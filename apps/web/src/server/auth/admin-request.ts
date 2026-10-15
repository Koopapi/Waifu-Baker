import "server-only";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { checkAdminAccess } from "@/server/services/admin-guard";

/** RF-1/RF-2 para route handlers: devuelve la sesión o null (el handler responde 404). */
export async function adminFromRequest(path: string) {
  const session = await auth();
  const ok = await checkAdminAccess(db, session?.user?.id || null, path);
  return ok && session ? session : null;
}

export const notFoundResponse = () => new Response("Not found", { status: 404 });
