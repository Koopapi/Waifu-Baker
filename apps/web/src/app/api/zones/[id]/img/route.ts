import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { getCardStore } from "@/server/cards/store-instance";
import { zoneImageFile } from "@/server/services/expedition-zones";

export const runtime = "nodejs";

/** Spec 020, RF-28: imagen de una zona del mapa, para quien tiene sesión (el administrador también ve las ocultas). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!z.string().uuid().safeParse(id).success || !session?.user?.id) return new Response("Not found", { status: 404 });
  const file = await zoneImageFile(db, getCardStore(), id, session.user.role === "admin");
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=3600" } });
}
