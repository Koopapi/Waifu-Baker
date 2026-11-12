// Spec 038, RF-7 a RF-11: al arrancar, los sellos de las cartas ya armadas pasan a los nombres nuevos de rareza
// (E → UR, LEG → SSR), en lo vigente y en lo pendiente de revisión 18+, con una versión en el historial. La carta queda
// marcada para que la regeneración de imágenes fijas (spec 037) la vuelva a dibujar. Idempotente.
import { eq, isNotNull, or } from "drizzle-orm";
import { cards } from "@/db/schema";
import { renameSeal } from "@/domain/cards/seal-rename";
import { sheetOf } from "@/domain/cards/versions";
import type { DbLike } from "@/server/db-types";
import { insertVersion } from "./card-save";

export async function renameRaritySeals(db: DbLike): Promise<number> {
  const rows = await db
    .select({ id: cards.id, rarity: cards.rarity, layers: cards.layers, layersPending: cards.layersPending })
    .from(cards)
    .where(or(isNotNull(cards.layers), isNotNull(cards.layersPending)));
  let renamed = 0;
  for (const r of rows) {
    if (!renameSeal(r.layers, r.rarity) && !renameSeal(r.layersPending, r.rarity)) continue;
    await db.transaction(async (tx) => {
      const [cur] = await tx.select().from(cards).where(eq(cards.id, r.id)).for("update");
      if (!cur) return;
      const layers = renameSeal(cur.layers, cur.rarity);
      const pending = renameSeal(cur.layersPending, cur.rarity);
      if (!layers && !pending) return;
      // RF-11: lo pendiente cambia igual, sin pedir otra revisión 18+ (la revisión no se toca).
      await tx
        .update(cards)
        .set({ layers: layers ?? cur.layers, layersPending: pending ?? cur.layersPending, flatVersion: 0, flatError: null, version: cur.version + 1 })
        .where(eq(cards.id, cur.id));
      // RF-10: una versión en el historial con el motivo, sin autor (lo hace el sistema).
      await insertVersion(tx, { cardId: cur.id, ficha: sheetOf(cur), layers: layers ?? cur.layers, changed: "rareza", pending: Boolean(pending), actorUserId: null });
      renamed += 1;
    });
  }
  return renamed;
}
