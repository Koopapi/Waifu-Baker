// Spec 024: comprobación de salud para Coolify (RF-3): la base de datos responde y la carpeta de imágenes se puede usar.
import { access, constants } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await access(process.env.CARD_STORE_DIR ?? path.resolve(process.cwd(), "var/cards"), constants.W_OK).catch(async (e) => {
      // En desarrollo la carpeta se crea con la primera imagen; en el servidor tiene que existir (volumen).
      if (process.env.NODE_ENV === "production") throw e;
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
