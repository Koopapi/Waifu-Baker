// Spec 027, RF-19: las versiones conservadas de una carta (la más reciente primero).
import { z } from "zod";
import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { listVersions } from "@/server/services/card-save";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminFromRequest("/api/admin/cards/versions");
  const { id } = await params;
  if (!session || !z.string().uuid().safeParse(id).success) return notFoundResponse();
  try {
    const versions = (await listVersions(db, id)).map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }));
    return Response.json({ ok: true, versions });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: e.code === "not_found" ? 404 : 422 });
    throw e;
  }
}
