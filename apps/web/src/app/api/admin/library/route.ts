import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { listLibraryEntries, uploadLibraryImage } from "@/server/services/library";
import { assetUrl } from "@/features/admin/cards/types";

export const runtime = "nodejs";

const IMAGE_KINDS = ["fondo", "sello", "adorno"] as const;

/**
 * Spec 031, RF-3 y RF-9: la biblioteca para el editor de una carta, que la pide al abrirse (la página de la colección
 * ya no la manda). Solo para administradores; sin el uso de cada imagen (RF-4).
 */
export async function GET() {
  const session = await adminFromRequest("/api/admin/library");
  if (!session) return notFoundResponse();
  const items = await listLibraryEntries(db);
  return Response.json({ ok: true, items: items.map((i) => ({ id: i.id, kind: i.kind, name: i.name, key: i.key, url: assetUrl(i.key), particles: i.particles })) });
}

/** Spec 017, RF-6 y RF-7: sube un fondo, un sello o un adorno a la biblioteca general. Un archivo por petición. */
export async function POST(req: Request) {
  const session = await adminFromRequest("/api/admin/library");
  if (!session) return notFoundResponse();
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  const file = form.get("file");
  const kind = IMAGE_KINDS.find((k) => k === form.get("kind"));
  if (!(file instanceof File) || !kind) {
    return Response.json({ ok: false, code: "bad_request", message: (await getDict()).admin.api.missingSetOrFile }, { status: 400 });
  }
  try {
    const item = await uploadLibraryImage(db, getCardStore(), session.user.id, kind, { body: Buffer.from(await file.arrayBuffer()), mime: file.type, filename: file.name });
    revalidatePath("/admin/library");
    return Response.json({ ok: true, item: { id: item.id, kind: item.kind, name: item.name, key: item.key }, scaled: item.scaled });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: 422 });
    throw e;
  }
}
