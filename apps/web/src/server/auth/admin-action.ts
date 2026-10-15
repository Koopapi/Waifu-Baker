import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import type { Db } from "@/db/client";
import { isAdminError } from "@/server/errors";
import { requireAdmin } from "./require-admin";

export type ActionState = { ok: boolean; error?: string; code?: string; message?: string; at?: number };

/**
 * Envuelve una server action del panel: verifica rol (RF-1/RF-2), convierte AdminError en un
 * mensaje para el formulario y revalida las rutas indicadas.
 */
export async function adminAction(
  name: string,
  revalidate: string[],
  fn: (ctx: { db: Db; actorId: string }) => Promise<string | void>,
): Promise<ActionState> {
  const session = await requireAdmin(`action:${name}`);
  try {
    const message = await fn({ db, actorId: session.user.id });
    for (const p of revalidate) revalidatePath(p);
    return { ok: true, message: message ?? undefined, at: Date.now() };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: e.message, code: e.code, at: Date.now() };
    throw e;
  }
}
