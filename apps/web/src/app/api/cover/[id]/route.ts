import { z } from "zod";
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { coverCardImageKey } from "@/server/services/settings";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });

/**
 * Spec 028, RF-21 y RF-22: imagen de una carta de portada. Solo la reducida con marca de agua (`key_public`) y solo si
 * la carta está entre las de portada y su colección sigue publicada y no es 18+.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return notFound();
  const key = await coverCardImageKey(db, id);
  if (!key) return notFound();
  const file = await getCardStore().get(key);
  if (!file) return notFound();
  return new Response(new Uint8Array(file.body), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex, nofollow" },
  });
}
