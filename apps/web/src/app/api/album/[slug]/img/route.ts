import { z } from "zod";
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { publicCardImageKey } from "@/server/services/album";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });

/** RF-15: en un álbum público solo se sirve la imagen reducida con marca de agua. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cardId = new URL(req.url).searchParams.get("c") ?? "";
  if (!/^[0-9A-Za-z]{12}$/.test(slug) || !z.string().uuid().safeParse(cardId).success) return notFound();
  const key = await publicCardImageKey(db, slug, cardId);
  if (!key) return notFound();
  const file = await getCardStore().get(key);
  if (!file) return notFound();
  return new Response(new Uint8Array(file.body), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex, nofollow" },
  });
}
