"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { isAdminError } from "@/server/errors";
import { activateAlbum, deactivateAlbum, regenerateAlbumLink, setFeatured } from "@/server/services/album";

export type AlbumActionState = { ok: boolean; message?: string; error?: string } | null;

async function run(fn: (userId: string) => Promise<unknown>, message: string): Promise<AlbumActionState> {
  const userId = (await auth())?.user?.id;
  if (!userId) return { ok: false, error: "Tu sesión ha caducado: vuelve a entrar." };
  try {
    await fn(userId);
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath("/coleccion/album");
  revalidatePath("/coleccion");
  return { ok: true, message };
}

/** RF-9: activar (o cambiar el alias) con un alias de 2 a 30 caracteres. */
export async function activateAlbumAction(_: AlbumActionState, form: FormData) {
  return run((u) => activateAlbum(db, u, String(form.get("alias") ?? "")), "Álbum público activado.");
}

/** RF-10 */
export async function deactivateAlbumAction() {
  return run((u) => deactivateAlbum(db, u), "Álbum desactivado: el enlace ya no muestra nada.");
}

/** RF-11 */
export async function regenerateAlbumLinkAction() {
  return run((u) => regenerateAlbumLink(db, u), "Enlace nuevo creado. El anterior ya no funciona.");
}

/** RF-12 */
export async function saveFeaturedAction(cardIds: string[]) {
  return run((u) => setFeatured(db, u, cardIds), "Destacadas guardadas.");
}
