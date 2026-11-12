import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { cards, userCards } from "@/db/schema";
import { verifyImage, type ImageSize } from "@/domain/signed-url";
import { getCardStore } from "@/server/cards/store-instance";
import { imageSecret } from "@/server/cards/image-urls";

export const runtime = "nodejs";

type KeyColumn = "keyThumb" | "keyMid" | "keyFull" | "keyHoloThumb" | "keyHoloMid";
/** Columna de cada tamaño y, para los holo, la normal si la carta aún no tiene imagen holo (spec 037, RF-19). */
const SIZES: Record<ImageSize, [KeyColumn, KeyColumn?]> = {
  thumb: ["keyThumb"],
  mid: ["keyMid"],
  full: ["keyFull"],
  "thumb-holo": ["keyHoloThumb", "keyThumb"],
  "mid-holo": ["keyHoloMid", "keyMid"],
};
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
  const [column, fallback] = SIZES[size];
  const [owned] = await db
    .select({ key: cards[column], fallback: cards[fallback ?? column] })
    .from(userCards)
    .innerJoin(cards, eq(cards.id, userCards.cardId))
    .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
    .limit(1);
  const key = owned?.key ?? owned?.fallback;
  if (!key) return notFound();
  const file = await getCardStore().get(key);
  if (!file) return notFound();
  const maxAge = Math.max(0, Math.floor((expires - Date.now()) / 1000));
  return new Response(new Uint8Array(file.body), {
    headers: { "Content-Type": file.contentType, "Cache-Control": `private, max-age=${maxAge}` },
  });
}
