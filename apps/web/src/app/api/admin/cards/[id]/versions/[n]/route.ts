// Spec 027, RF-20: la foto completa de una versión, para cargarla en la ventana como cambios sin guardar.
import { z } from "zod";
import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { getVersion } from "@/server/services/card-save";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const session = await adminFromRequest("/api/admin/cards/versions");
  const { id, n } = await params;
  const number = Number(n);
  if (!session || !z.string().uuid().safeParse(id).success || !Number.isInteger(number) || number < 1) return notFoundResponse();
  try {
    const v = await getVersion(db, id, number);
    return Response.json({ ok: true, version: { ...v, createdAt: v.createdAt.toISOString() } });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: e.code === "not_found" ? 404 : 422 });
    throw e;
  }
}
