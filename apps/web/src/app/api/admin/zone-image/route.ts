import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { uploadZoneImage } from "@/server/services/expedition-zones";

export const runtime = "nodejs";

/** Spec 020, RF-28: sube la imagen de una zona del mapa. */
export async function POST(req: Request) {
  const session = await adminFromRequest("/api/admin/zone-image");
  if (!session) return notFoundResponse();
  const form = await req.formData().catch(() => null);
  const zoneId = String(form?.get("zoneId") ?? "");
  const file = form?.get("file");
  if (!zoneId || !(file instanceof File)) return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  try {
    await uploadZoneImage(db, getCardStore(), session.user.id, zoneId, { body: Buffer.from(await file.arrayBuffer()), mime: file.type, filename: file.name });
    revalidatePath("/admin/expediciones");
    revalidatePath("/juegos/expediciones");
    return Response.json({ ok: true });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: e.code === "not_found" ? 404 : 422 });
    throw e;
  }
}
