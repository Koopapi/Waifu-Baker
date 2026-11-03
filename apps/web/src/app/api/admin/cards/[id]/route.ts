// Spec 027, RF-1 a RF-3: el guardado único de la carta (ficha y capas en una sola operación).
import { eq } from "drizzle-orm";
import { z } from "zod";
import { characters } from "@/db/schema";
import { db } from "@/db/client";
import { RARITIES } from "@/domain/catalog/card-rules";
import { toCardDTO } from "@/features/admin/cards/dto";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { translateError } from "@/i18n/errors";
import { getDict } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { saveCard } from "@/server/services/card-save";

export const runtime = "nodejs";

const STATUS: Record<string, number> = { not_found: 404, stale_version: 409 };
const ficha = z
  .object({
    name: z.string().max(60).optional(),
    flavorText: z.string().max(2000).optional(),
    characterId: z.string().uuid().nullable().optional(),
    rarity: z.enum(RARITIES).nullable().optional(),
    variant: z.enum(["normal", "holo", "alt"]).optional(),
  })
  .strict();
const body = z.object({ ficha: ficha.optional(), layers: z.unknown().optional(), version: z.number().int(), force: z.boolean().optional(), restoredFrom: z.number().int().positive().optional() });

async function fail(e: unknown) {
  if (isAdminError(e)) return Response.json({ ok: false, code: e.code, message: translateError(await getDict(), e) }, { status: STATUS[e.code] ?? 422 });
  throw e;
}

/** RF-1 y RF-2: guarda ficha y capas juntas; si algo falla, nada cambia y se dice por qué. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await adminFromRequest("/api/admin/cards");
  const { id } = await params;
  if (!session || !z.string().uuid().safeParse(id).success) return notFoundResponse();
  const raw = await req.json().catch(() => null);
  const parsed = body.safeParse(raw);
  if (!parsed.success) return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  // Sin el campo `layers` las capas no se tocan; con `null` se quitan.
  const input = { ...parsed.data, layers: raw && typeof raw === "object" && "layers" in raw ? parsed.data.layers ?? null : undefined };
  try {
    const r = await saveCard(db, getCardStore(), session.user.id, id, { ficha: input.ficha, layers: input.layers, expectedVersion: input.version, force: input.force, restoredFrom: input.restoredFrom });
    const [ch] = r.card.characterId ? await db.select({ name: characters.name }).from(characters).where(eq(characters.id, r.card.characterId)) : [];
    return Response.json({
      ok: true,
      card: toCardDTO(r.card, { characterName: ch?.name ?? null, chance: 0 }),
      pending: r.pending,
      repeated: r.repeated,
      changed: r.changed,
      versionNumber: r.versionNumber,
      layersSealToReview: r.layersSealToReview,
    });
  } catch (e) {
    return fail(e);
  }
}
