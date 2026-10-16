"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db/client";
import type { Dict } from "@/i18n";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { activateAlbum, deactivateAlbum, regenerateAlbumLink, setFeatured } from "@/server/services/album";

export type AlbumActionState = { ok: boolean; message?: string; error?: string } | null;

async function run(fn: (userId: string) => Promise<unknown>, message: (t: Dict) => string): Promise<AlbumActionState> {
  const t = await getDict();
  const userId = (await auth())?.user?.id;
  if (!userId) return { ok: false, error: t.common.sessionExpired };
  try {
    await fn(userId);
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(t, e) };
    throw e;
  }
  revalidatePath("/coleccion/album");
  revalidatePath("/coleccion");
  return { ok: true, message: message(t) };
}

/** RF-9: activar (o cambiar el alias) con un alias de 2 a 30 caracteres. */
export async function activateAlbumAction(_: AlbumActionState, form: FormData) {
  return run((u) => activateAlbum(db, u, String(form.get("alias") ?? "")), (t) => t.collection.album.activated);
}

/** RF-10 */
export async function deactivateAlbumAction() {
  return run((u) => deactivateAlbum(db, u), (t) => t.collection.album.deactivated);
}

/** RF-11 */
export async function regenerateAlbumLinkAction() {
  return run((u) => regenerateAlbumLink(db, u), (t) => t.collection.album.regenerated);
}

/** RF-12 */
export async function saveFeaturedAction(cardIds: string[]) {
  return run((u) => setFeatured(db, u, cardIds), (t) => t.collection.album.featuredSaved);
}
