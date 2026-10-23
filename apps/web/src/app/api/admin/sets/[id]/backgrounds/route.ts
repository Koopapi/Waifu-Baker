import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { uploadSetBackground } from "@/server/services/set-backgrounds";

export const runtime = "nodejs";

/** Spec 017, RF-6 y RF-7: sube un fondo a la biblioteca de la colección. Un archivo por petición. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminFromRequest("/api/admin/sets/backgrounds");
  if (!session) return notFoundResponse();
  const { id } = await params;
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, code: "bad_request", message: (await getDict()).admin.api.missingSetOrFile }, { status: 400 });
  }
  try {
    const bg = await uploadSetBackground(db, getCardStore(), session.user.id, id, { body: Buffer.from(await file.arrayBuffer()), mime: file.type, filename: file.name });
    revalidatePath(`/admin/sets/${id}`);
    return Response.json({ ok: true, background: { id: bg.id, name: bg.name, key: bg.key }, scaled: bg.scaled });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: e.code === "not_found" ? 404 : 422 });
    throw e;
  }
}
