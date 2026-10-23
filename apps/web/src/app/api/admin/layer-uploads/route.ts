import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { stageLayerImage } from "@/server/cards/layer-images";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";

export const runtime = "nodejs";

/**
 * Spec 016, RF-6 y RF-19 a RF-21: sube una imagen de capa (o de sello) al área temporal. Un archivo por petición: el
 * editor envía varios en paralelo y cada uno se acepta o se rechaza con su motivo sin parar el resto (RF-31).
 */
export async function POST(req: Request) {
  const session = await adminFromRequest("/api/admin/layer-uploads");
  if (!session) return notFoundResponse();
  const form = await req.formData();
  const file = form.get("file");
  const kind = form.get("kind") === "seal" ? "seal" : "layer";
  if (!(file instanceof File)) {
    return Response.json({ ok: false, code: "bad_request", message: (await getDict()).admin.api.missingSetOrFile }, { status: 400 });
  }
  try {
    const staged = await stageLayerImage(getCardStore(), { body: Buffer.from(await file.arrayBuffer()), mime: file.type, filename: file.name }, kind);
    return Response.json({ ok: true, ...staged, url: `/api/admin/assets/${staged.key}` });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: 422 });
    throw e;
  }
}
