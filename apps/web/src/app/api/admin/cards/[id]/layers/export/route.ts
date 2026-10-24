import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { exportCardLayers } from "@/server/services/card-layers";
import { buildZip } from "@/server/zip";

export const runtime = "nodejs";

/** Spec 017, RF-17: descarga la carta en el formato del creador (ZIP con `carta.json` y sus imágenes). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminFromRequest("/api/admin/cards/layers/export");
  if (!session) return notFoundResponse();
  const { id } = await params;
  try {
    const out = await exportCardLayers(db, getCardStore(), id);
    return new Response(new Uint8Array(buildZip(out.files)), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${out.fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: e.code === "not_found" ? 404 : 422 });
    throw e;
  }
}
