import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { uploadPackImage } from "@/server/services/pack-art";

export const runtime = "nodejs";

/** Spec 014, RF-7: sube el sobre hecho a mano de una colección. */
export async function POST(req: Request) {
  const session = await adminFromRequest("/api/admin/pack-image");
  if (!session) return notFoundResponse();
  const form = await req.formData();
  const setId = String(form.get("setId") ?? "");
  const file = form.get("file");
  if (!setId || !(file instanceof File)) {
    return Response.json({ ok: false, code: "bad_request", message: (await getDict()).admin.api.missingSetOrFile }, { status: 400 });
  }
  try {
    await uploadPackImage(db, getCardStore(), session.user.id, setId, { body: Buffer.from(await file.arrayBuffer()), mime: file.type, filename: file.name });
    revalidatePath(`/admin/sets/${setId}`);
    revalidatePath("/sobres");
    return Response.json({ ok: true });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: e.code === "not_found" ? 404 : 422 });
    throw e;
  }
}
