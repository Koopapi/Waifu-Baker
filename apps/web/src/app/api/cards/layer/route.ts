import { auth } from "@/auth";
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { serveLiveLayer } from "@/server/services/live-card";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404 });

/** Spec 018, RF-16: sirve una capa de una carta solo con enlace válido, de la misma sesión y para quien la tiene. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return notFound();
  const expires = Number(u.searchParams.get("e"));
  const file = await serveLiveLayer(db, getCardStore(), userId, {
    cardId: u.searchParams.get("c") ?? "",
    key: u.searchParams.get("k") ?? "",
    expires,
    sig: u.searchParams.get("sig") ?? "",
  });
  if (!file) return notFound();
  const maxAge = Math.max(0, Math.floor((expires - Date.now()) / 1000));
  return new Response(new Uint8Array(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": `private, max-age=${maxAge}` } });
}
