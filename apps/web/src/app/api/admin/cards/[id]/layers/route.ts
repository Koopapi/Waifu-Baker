import { z } from "zod";
import { db } from "@/db/client";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { getCardLayers, removeCardLayers, saveCardLayers } from "@/server/services/card-layers";

export const runtime = "nodejs";

const STATUS: Record<string, number> = { not_found: 404, stale_version: 409 };
const body = z.object({ config: z.unknown().optional(), version: z.number().int(), force: z.boolean().optional() });

async function fail(e: unknown) {
  if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: STATUS[e.code] ?? 422 });
  throw e;
}

async function guard(params: Promise<{ id: string }>) {
  const session = await adminFromRequest("/api/admin/cards/layers");
  const { id } = await params;
  return session && z.string().uuid().safeParse(id).success ? { session, id } : null;
}

/** Spec 016, RF-20: configuración guardada y versión actual (recargar tras un conflicto). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(params);
  if (!g) return notFoundResponse();
  try {
    return Response.json({ ok: true, ...(await getCardLayers(db, g.id)) });
  } catch (e) {
    return fail(e);
  }
}

/** RF-14 a RF-22: guarda la configuración (`force` solo tras confirmar el aviso de conflicto). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(params);
  if (!g) return notFoundResponse();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  try {
    const r = await saveCardLayers(db, getCardStore(), g.session.user.id, g.id, { config: parsed.data.config, expectedVersion: parsed.data.version, force: parsed.data.force });
    return Response.json({ ok: true, layers: r.card.layers, version: r.card.version, repeated: r.repeated });
  } catch (e) {
    return fail(e);
  }
}

/** RF-18, RF-67, RF-68: quita todas las capas. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(params);
  if (!g) return notFoundResponse();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  try {
    const card = await removeCardLayers(db, getCardStore(), g.session.user.id, g.id, { expectedVersion: parsed.data.version, force: parsed.data.force });
    return Response.json({ ok: true, layers: null, version: card.version });
  } catch (e) {
    return fail(e);
  }
}
