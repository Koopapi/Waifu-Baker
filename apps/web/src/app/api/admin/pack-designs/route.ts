import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { PACK_KINDS } from "@/domain/catalog/default-odds";
import { UPLOAD_REF } from "@/domain/packs/design";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { savePackDesign } from "@/server/services/pack-designs";
import type { UploadFile } from "@/server/services/cards";

export const runtime = "nodejs";

const toUpload = async (f: File): Promise<UploadFile> => ({ body: Buffer.from(await f.arrayBuffer()), mime: f.type, filename: f.name });

/**
 * Spec 030, RF-10 a RF-13: guarda el diseño del sobre (plata o gold) de una colección, solo administradores. Multipart:
 * `setId`, `kind`, `design` (JSON), `thumb` (PNG de 500 × 875) y una parte por imagen nueva con su marca `upload:<n>`.
 */
export async function POST(req: Request) {
  const session = await adminFromRequest("/api/admin/pack-designs");
  if (!session) return notFoundResponse();
  const form = await req.formData().catch(() => null);
  const setId = String(form?.get("setId") ?? "");
  const kind = String(form?.get("kind") ?? "");
  let design: unknown = null;
  try {
    design = JSON.parse(String(form?.get("design") ?? "null"));
  } catch {
    design = null;
  }
  if (!form || !z.string().uuid().safeParse(setId).success || !(PACK_KINDS as readonly string[]).includes(kind)) {
    return Response.json({ ok: false, code: "bad_request", message: (await getDict()).admin.api.missingSetOrFile }, { status: 400 });
  }
  const uploads = new Map<string, UploadFile>();
  for (const [name, value] of form.entries()) if (UPLOAD_REF.test(name) && value instanceof File) uploads.set(name, await toUpload(value));
  const thumb = form.get("thumb");
  try {
    const row = await savePackDesign(db, getCardStore(), session.user.id, setId, kind as (typeof PACK_KINDS)[number], { design, uploads, thumb: thumb instanceof File ? await toUpload(thumb) : null });
    revalidatePath(`/admin/sets/${setId}`);
    revalidatePath("/packs");
    return Response.json({ ok: true, version: row.version, updatedAt: row.updatedAt.toISOString(), design: row.design, keys: row.keys });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, path: e.params?.path ?? null, message: translateError(await getDict(), e) }, { status: e.code === "not_found" ? 404 : 422 });
    throw e;
  }
}
