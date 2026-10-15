import { adminFromRequest, notFoundResponse } from "@/server/auth/admin-request";
import { getCardStore } from "@/server/cards/store-instance";

export const runtime = "nodejs";

/** Sirve originales y cartas compuestas solo a administradores (RNF de la spec 003). */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const session = await adminFromRequest("/api/admin/assets");
  if (!session) return notFoundResponse();
  const file = await getCardStore().get(key.join("/"));
  if (!file) return notFoundResponse();
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      // Las claves de las compuestas llevan la huella del contenido: se pueden cachear sin miedo.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
