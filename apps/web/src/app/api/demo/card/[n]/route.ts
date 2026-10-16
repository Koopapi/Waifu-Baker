import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, sets } from "@/db/schema";
import { isDemoEnabled } from "@/domain/demo/mode";
import { getCardStore } from "@/server/cards/store-instance";

export const runtime = "nodejs";

/** Spec 010, RF-13: miniaturas de la colección de la demo para su portada. Solo en modo demo. */
export async function GET(_: Request, { params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  if (!isDemoEnabled(process.env) || !Number.isInteger(n)) return new Response("Not found", { status: 404 });
  const [card] = await db
    .select({ key: cards.keyMid })
    .from(cards)
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(sets.isWelcome, true), eq(cards.number, n)));
  const file = card?.key ? await getCardStore().get(card.key) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=300" } });
}
