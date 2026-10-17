import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { packArtFile } from "@/server/services/pack-art";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404 });

/** Spec 014, RF-8: portada (`?k=cover`) o sobre a mano (`?k=pack`) de una colección, con sesión y regla 18+. */
export async function GET(req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const kind = new URL(req.url).searchParams.get("k");
  if (!z.string().uuid().safeParse(setId).success || (kind !== "cover" && kind !== "pack")) return notFound();
  const userId = (await auth())?.user?.id ?? null;
  const file = await packArtFile(db, getCardStore(), userId, setId, kind);
  if (!file) return notFound();
  return new Response(new Uint8Array(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=300" } });
}
