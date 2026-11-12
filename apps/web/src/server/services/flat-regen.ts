// Spec 037, RF-17 y RF-18: al desplegar una receta nueva de imagen fija (FLAT_VERSION), el servidor regenera una a una
// las cartas armadas que tengan una anterior. Si una falla, conserva sus imágenes y queda con el motivo para reintentar.
import { and, asc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { cards, sets } from "@/db/schema";
import { FLAT_VERSION } from "@/domain/cards/flat-version";
import { renderCardFlat, storeFlat } from "@/server/cards/flat-store";
import type { CardStore } from "@/server/ports/card-store";
import type { DbLike } from "@/server/db-types";
import { composeAndStore, composedKeys, deleteKeys, pendingFlatKeys, toPendingKeys } from "./card-shared";

export type RegenResult = { ok: true } | { ok: false; error: string } | { ok: "skipped" };

const reasonOf = (e: unknown) => {
  const err = e as { message?: string; params?: { reason?: string } };
  return [err.message, err.params?.reason].filter(Boolean).join(" · ").slice(0, 300) || "error desconocido";
};

/**
 * RF-17: vuelve a sacar la imagen fija (y la holo) de una carta armada con su configuración guardada, y la de lo
 * pendiente de revisión si lo hay. No cuenta como edición: no sube la versión de la carta. Si alguien la guarda mientras
 * tanto, se descarta lo regenerado (el guardado ya trae imágenes nuevas). RF-18: si falla, guarda el motivo.
 */
export async function regenerateCardFlat(db: DbLike, store: CardStore, cardId: string): Promise<RegenResult> {
  const [row] = await db.select({ card: cards, code: sets.code }).from(cards).innerJoin(sets, eq(sets.id, cards.setId)).where(eq(cards.id, cardId));
  if (!row?.card.layers) return { ok: "skipped" };
  const cur = row.card;
  let fresh: (string | null)[] = [];
  try {
    const keys = await composeAndStore(store, cur, row.code);
    fresh = composedKeys({ ...cur, ...keys });
    let pending = {};
    if (cur.layersPending) {
      const p = await storeFlat(store, cur, await renderCardFlat(store, cur.layersPending));
      fresh = [...fresh, ...pendingFlatKeys(toPendingKeys(p))];
      pending = { pendingKeys: toPendingKeys(p) };
    }
    const updated = await db
      .update(cards)
      .set({ ...keys, ...pending, flatVersion: FLAT_VERSION, flatError: null })
      .where(and(eq(cards.id, cur.id), eq(cards.version, cur.version)))
      .returning({ id: cards.id });
    if (updated.length === 0) {
      await deleteKeys(store, fresh, db);
      return { ok: "skipped" };
    }
    await deleteKeys(store, [...composedKeys(cur), ...pendingFlatKeys(cur.pendingKeys)], db);
    return { ok: true };
  } catch (e) {
    if (fresh.length) await deleteKeys(store, fresh, db).catch(() => {});
    const error = reasonOf(e);
    await db.update(cards).set({ flatError: error }).where(eq(cards.id, cur.id));
    return { ok: false, error };
  }
}

/** RF-17: regenera las cartas armadas con receta anterior (sin fallo pendiente), de `batch` en `batch`, hasta acabar. */
export async function regenerateOutdated(db: DbLike, store: CardStore, opts: { batch?: number; max?: number } = {}) {
  const batch = opts.batch ?? 20;
  let done = 0;
  let failed = 0;
  for (;;) {
    if (opts.max !== undefined && done + failed >= opts.max) break;
    const rows = await db
      .select({ id: cards.id })
      .from(cards)
      .where(and(isNotNull(cards.layers), lt(cards.flatVersion, FLAT_VERSION), isNull(cards.flatError)))
      .orderBy(asc(cards.setId), asc(cards.number))
      .limit(batch);
    if (rows.length === 0) break;
    let progress = 0;
    for (const r of rows) {
      const res = await regenerateCardFlat(db, store, r.id);
      if (res.ok === true) done += 1;
      else if (res.ok === false) failed += 1;
      if (res.ok !== "skipped") progress += 1;
    }
    // Todas descartadas porque alguien las está guardando: se reintenta en la próxima pasada.
    if (progress === 0) break;
  }
  return { done, failed };
}

/** RF-18: las cartas de una colección cuya regeneración falló, con su motivo (para el panel). */
export async function failedFlats(db: DbLike, setId: string) {
  return db
    .select({ id: cards.id, number: cards.number, name: cards.name, error: cards.flatError })
    .from(cards)
    .where(and(eq(cards.setId, setId), isNotNull(cards.flatError)))
    .orderBy(asc(cards.number));
}
