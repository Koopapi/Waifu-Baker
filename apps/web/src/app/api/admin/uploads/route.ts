import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { uploadCardImage } from "@/server/services/cards";

export const runtime = "nodejs";

const STATUS: Record<string, number> = { not_found: 404, locked: 409, duplicate_image: 409 };

/** RF-11: un archivo por petición; el cliente envía varios en paralelo. */
export async function POST(req: Request) {
  const session = await adminFromRequest("/api/admin/uploads");
  if (!session) return notFoundResponse();
  const form = await req.formData();
  const setId = String(form.get("setId") ?? "");
  const file = form.get("file");
  if (!setId || !(file instanceof File)) {
    return Response.json({ ok: false, code: "bad_request", message: (await getDict()).admin.api.missingSetOrFile }, { status: 400 });
  }
  try {
    const card = await uploadCardImage(db, getCardStore(), session.user.id, setId, {
      body: Buffer.from(await file.arrayBuffer()),
      mime: file.type,
      filename: file.name,
    });
    return Response.json({ ok: true, card: { id: card.id, number: card.number } });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: STATUS[e.code] ?? 422 });
    throw e;
  }
}
