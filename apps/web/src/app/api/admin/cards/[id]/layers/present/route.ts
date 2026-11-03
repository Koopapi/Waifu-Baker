// Spec 027, RF-16: de las claves de imagen de un borrador, cuáles ya no están (al recuperarlo se quitan esas capas).
import { z } from "zod";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { missingKeys } from "@/server/services/card-save";

export const runtime = "nodejs";

const body = z.object({ keys: z.array(z.string().max(300)).max(40) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminFromRequest("/api/admin/cards/layers");
  const { id } = await params;
  if (!session || !z.string().uuid().safeParse(id).success) return notFoundResponse();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  return Response.json({ ok: true, missing: await missingKeys(getCardStore(), parsed.data.keys) });
}
