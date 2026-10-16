import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/db/client";
import { isDevLoginEnabled } from "@/domain/auth/access";
import { RARITIES } from "@/domain/catalog/card-rules";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";
import { isAdminError } from "@/server/errors";
import { seedGift, seedPublishedSet } from "@/server/services/dev-seed";

export const runtime = "nodejs";

const allowed = () => isDevLoginEnabled(process.env) && process.env.NODE_ENV !== "production";

// Solo arte de `public/lab` (personajes adultos ya revisados); nunca rutas arbitrarias del disco.
const LAB = path.resolve(process.cwd(), "public/lab");
const Rarity = z.enum(RARITIES);

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("publishedSet"),
    code: z.string(),
    name: z.string(),
    characterName: z.string(),
    packSize: z.number().int(),
    isAdult: z.boolean().default(false),
    cards: z.array(z.object({ image: z.string().regex(/^[\w-]+\.webp$/), name: z.string(), rarity: Rarity })).min(1),
    slots: z.array(z.partialRecord(Rarity, z.number())),
    holoPercent: z.number().min(0).max(100).optional(),
  }),
  z.object({
    action: z.literal("gift"),
    userName: z.string().min(1),
    setCode: z.string().min(1),
    count: z.number().int(),
    reason: z.string(),
  }),
]);

/**
 * Solo desarrollo y E2E: prepara datos por los mismos servicios que usa el panel, sin pasar por su
 * interfaz. Lo llama un administrador con sesión (queda como autor en la auditoría).
 * - `publishedSet`: crea personaje y colección, sube las cartas, las completa y publica → `{ setId }`.
 * - `gift`: regala sobres de una colección a un usuario de desarrollo por su nombre → `{ userId }`.
 */
export async function POST(req: Request) {
  if (!allowed()) return notFoundResponse();
  const session = await adminFromRequest("/api/dev/seed");
  if (!session) return notFoundResponse();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "gift") {
      const userId = await seedGift(db, session.user.id, b);
      return Response.json({ userId });
    }
    const cards = await Promise.all(
      b.cards.map(async (c) => ({
        name: c.name,
        rarity: c.rarity,
        file: { body: await readFile(path.join(LAB, c.image)), mime: "image/webp", filename: c.image },
      })),
    );
    const setId = await seedPublishedSet(db, getCardStore(), session.user.id, { ...b, cards });
    return Response.json({ setId });
  } catch (e) {
    if (isAdminError(e)) return Response.json({ error: e.code, message: e.message, params: e.params }, { status: 422 });
    return Response.json({ error: "seed_failed", message: (e as Error).message }, { status: 500 });
  }
}
