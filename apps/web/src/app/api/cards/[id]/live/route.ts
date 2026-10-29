import { auth } from "@/auth";
import { db } from "@/db/client";
import { liveCardConfig } from "@/server/services/live-card";

export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404 });

/** Spec 018, RF-16 y RF-17: la carta viva (configuración con enlaces firmados) para quien la tiene. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return notFound();
  const { id } = await params;
  const live = await liveCardConfig(db, userId, id);
  if (!live) return notFound();
  return Response.json(live, { headers: { "Cache-Control": "private, no-store" } });
}
