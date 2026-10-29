// Spec 019: «Abrir todos» dinámico. Ritmo de la ráfaga, destacadas del foco y resumen agrupado. Puro, sin E/S.
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";

/** Una carta del lote tal como la devuelve «Abrir todos» (lo que hace falta para ordenar y agrupar). */
export interface LotCard {
  key: string;
  number: number;
  rarity: Rarity;
  holo: boolean;
  /** Primera copia de esa versión para el coleccionista (antes del lote no la tenía). */
  isNew: boolean;
  /** Copias de esa versión que tiene tras recibir esta carta. */
  qtyAfter: number;
}

export const BURST_MAX_MS = 6000;
/** Pausa tras el último sobre, para que se vean caer sus cartas. */
export const BURST_END_MS = 450;
/** Margen para el pintado del navegador: la ráfaga completa queda holgada por debajo de 6 s. */
const BURST_MARGIN_MS = 150;
const BURST_SLOW_MS = 600;

/**
 * RF-2: intervalo entre sobres: pausado (600 ms) con pocos y más rápido con muchos. `total` es lo que tardan en
 * rasgarse; con la pausa final y el margen no pasa de 6 s.
 */
export function burstPlan(packs: number) {
  const budget = BURST_MAX_MS - BURST_END_MS - BURST_MARGIN_MS;
  const interval = Math.min(BURST_SLOW_MS, Math.floor(budget / Math.max(1, packs)));
  return { interval, total: interval * packs };
}

/**
 * RF-3: puerta del sonido de la ráfaga: dice si un rasgado en el momento `now` (ms) puede sonar sin pasar de un sonido
 * cada `gap` ms, y si suena lo apunta.
 */
export function soundGate(gap: number) {
  let last = -Infinity;
  return (now: number) => {
    if (now - last < gap) return false;
    last = now;
    return true;
  };
}

const rank = (r: Rarity) => RARITIES.indexOf(r);
const version = (c: Pick<LotCard, "number" | "holo">) => `${c.number}-${c.holo}`;
export const MAX_HIGHLIGHTS = 10;

/** Destacada: épica, legendaria o secreta siempre; rara solo si es nueva. */
const isHighlight = (c: LotCard) => rank(c.rarity) >= rank("epic") || (c.rarity === "rare" && c.isNew);

/**
 * RF-4, RF-5 y RF-8: las destacadas del lote, una por versión (la copia nueva si la hay), de mayor a menor rareza y,
 * a igual rareza, nuevas y holo primero; como mucho 10. Vacío si no hay ninguna.
 */
export function highlights<T extends LotCard>(lot: T[]): T[] {
  const best = new Map<string, T>();
  for (const c of lot.filter(isHighlight)) {
    const cur = best.get(version(c));
    if (!cur || (c.isNew && !cur.isNew)) best.set(version(c), c);
  }
  return [...best.values()]
    .sort((a, b) => rank(b.rarity) - rank(a.rarity) || Number(b.isNew) - Number(a.isNew) || Number(b.holo) - Number(a.holo) || a.number - b.number)
    .slice(0, MAX_HIGHLIGHTS);
}

export interface LotVersion<T> {
  number: number;
  holo: boolean;
  /** Copias de esta versión que salieron en el lote. */
  copies: number;
  isNew: boolean;
  /** Copias que tiene el coleccionista al terminar el lote. */
  qtyAfter: number;
  card: T;
}

/** RF-10 a RF-12: grupos por rareza (de la más rara a la más común) con su cuenta; cada versión una vez. */
export function groupByRarity<T extends LotCard>(lot: T[]): { rarity: Rarity; count: number; versions: LotVersion<T>[] }[] {
  const byVersion = new Map<string, LotVersion<T>>();
  for (const c of lot) {
    const v = byVersion.get(version(c));
    if (v) {
      v.copies += 1;
      v.isNew ||= c.isNew;
      v.qtyAfter = Math.max(v.qtyAfter, c.qtyAfter);
    } else byVersion.set(version(c), { number: c.number, holo: c.holo, copies: 1, isNew: c.isNew, qtyAfter: c.qtyAfter, card: c });
  }
  return [...RARITIES]
    .reverse()
    .map((rarity) => {
      const versions = [...byVersion.values()]
        .filter((v) => v.card.rarity === rarity)
        .sort((a, b) => Number(b.isNew) - Number(a.isNew) || Number(b.holo) - Number(a.holo) || a.number - b.number);
      return { rarity, count: versions.reduce((n, v) => n + v.copies, 0), versions };
    })
    .filter((g) => g.count > 0);
}
