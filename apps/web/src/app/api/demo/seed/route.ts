import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { isDemoEnabled } from "@/domain/demo/mode";
import { parseDemoManifest } from "@/domain/demo/manifest";
import { getCardStore } from "@/server/cards/store-instance";
import { DEMO_BANNED_NAMES, seedDemo } from "@/server/services/demo-seed";

export const runtime = "nodejs";

/**
 * Spec 010, RF-12: llena la base de datos de la demo (la llama `pnpm demo` al arrancar). Solo en modo
 * demo (RF-15) y sobre una base vacía: si ya hay usuarios de la demo, no hace nada.
 */
export async function POST() {
  if (!isDemoEnabled(process.env)) return new Response("Not found", { status: 404 });
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.patreonUserId, "dev:demo-admin"));
  if (existing) return Response.json({ seeded: false, reason: "already seeded" }, { status: 409 });
  const artDir = path.resolve(process.env.ART_DIR ?? "");
  const manifestPath = path.resolve(process.cwd(), process.env.DEMO_MANIFEST ?? "demo/fanart.json");
  const manifest = parseDemoManifest(JSON.parse(await readFile(manifestPath, "utf8")), DEMO_BANNED_NAMES);
  // El manifiesto ya impide salir del taller; se comprueba también la ruta final.
  const readImage = (file: string) => {
    const full = path.resolve(artDir, file);
    if (!full.startsWith(artDir + path.sep)) throw new Error(`Ruta fuera del taller: ${file}`);
    return readFile(full);
  };
  const r = await seedDemo(db, getCardStore(), { manifest, readImage, now: new Date() });
  return Response.json({ seeded: true, cards: manifest.cards.length, ...r });
}
