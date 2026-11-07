import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { servePackAsset } from "@/server/services/pack-designs";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404 });

/** Spec 030 (RNF seguridad): una imagen del diseño del sobre o su miniatura, solo con enlace firmado y de la misma sesión. */
export async function GET(req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  if (!z.string().uuid().safeParse(setId).success) return notFound();
  const u = new URL(req.url);
  const expires = Number(u.searchParams.get("e"));
  const userId = (await auth())?.user?.id ?? null;
  const file = await servePackAsset(db, getCardStore(), userId, {
    setId,
    kind: u.searchParams.get("t") ?? "",
    key: u.searchParams.get("k") ?? "",
    expires,
    sig: u.searchParams.get("sig") ?? "",
  });
  if (!file) return notFound();
  const maxAge = Math.max(0, Math.floor((expires - Date.now()) / 1000));
  return new Response(new Uint8Array(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": `private, max-age=${maxAge}` } });
}
