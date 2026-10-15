import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { cards, userCards } from "@/db/schema";
import { verifyImage, type ImageSize } from "@/domain/signed-url";
import { getCardStore } from "@/server/cards/store-instance";
import { imageSecret } from "@/server/cards/image-urls";

export const runtime = "nodejs";

const SIZES: Record<ImageSize, "keyThumb" | "keyMid" | "keyFull"> = { thumb: "keyThumb", mid: "keyMid", full: "keyFull" };
const notFound = () => new Response("Not found", { status: 404 });

/** RF-20: sirve la imagen solo con enlace válido, de la misma sesión y para quien posee la carta. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const cardId = u.searchParams.get("c") ?? "";
  const size = (u.searchParams.get("s") ?? "") as ImageSize;
  const expires = Number(u.searchParams.get("e"));
  const sig = u.searchParams.get("sig") ?? "";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(size in SIZES) || !verifyImage({ cardId, size, userId, expires, sig }, imageSecret(), Date.now())) return notFound();
  const [owned] = await db
    .select({ key: cards[SIZES[size]] })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
    .limit(1);
  if (!owned?.key) return notFound();
  const file = await getCardStore().get(owned.key);
  if (!file) return notFound();
  const maxAge = Math.max(0, Math.floor((expires - Date.now()) / 1000));
  return new Response(new Uint8Array(file.body), {
    headers: { "Content-Type": file.contentType, "Cache-Control": `private, max-age=${maxAge}` },
  });
}
