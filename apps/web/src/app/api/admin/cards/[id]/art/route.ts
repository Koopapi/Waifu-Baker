import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { replaceCardArt } from "@/server/services/cards";

export const runtime = "nodejs";

/** Reemplaza el arte de una carta (RF-8 lo permite también en publicadas; RF-19 en 18+). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminFromRequest("/api/admin/cards/art");
  if (!session) return notFoundResponse();
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  const version = Number(form.get("version"));
  if (!(file instanceof File) || !Number.isInteger(version)) {
    return Response.json({ ok: false, message: (await getDict()).admin.api.missingFileOrVersion }, { status: 400 });
  }
  try {
    const card = await replaceCardArt(db, getCardStore(), session.user.id, id, version, {
      body: Buffer.from(await file.arrayBuffer()),
      mime: file.type,
      filename: file.name,
    });
    return Response.json({ ok: true, pending: Boolean(card.pendingOriginalKey) });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: 409 });
    throw e;
  }
}
