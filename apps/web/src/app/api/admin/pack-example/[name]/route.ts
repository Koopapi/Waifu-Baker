import { readFile } from "node:fs/promises";
import path from "node:path";
import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { PACK_EXAMPLE_FILES } from "@/domain/packs/example";

export const runtime = "nodejs";

/**
 * Spec 030: las capas del sobre de ejemplo FA01 y la carta de muestra del paquete de diseño (arte de prueba, decisión 7),
 * solo para el panel: «Cargar ejemplo FA01» y «Probar apertura» del editor de sobres.
 */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const session = await adminFromRequest("/api/admin/pack-example");
  if (!session) return notFoundResponse();
  const { name } = await params;
  if (!(PACK_EXAMPLE_FILES as readonly string[]).includes(name)) return notFoundResponse();
  const body = await readFile(path.join(process.cwd(), "assets", "sobres", "ejemplo", name));
  return new Response(new Uint8Array(body), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" } });
}
