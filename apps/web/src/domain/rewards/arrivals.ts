// Spec 015, RF-6 a RF-8: llegadas. Un sobre que el coleccionista recibe sin pedirlo (bienvenida, regalo del
// administrador, suscripción) se celebra una vez al entrar y lleva «¡Nuevo!» hasta que lo ve. Puro.

export const ARRIVAL_SOURCES = ["promo", "manual", "tier_grant"] as const;
export type ArrivalSource = (typeof ARRIVAL_SOURCES)[number];

export interface ArrivalPack {
  id: string;
  setId: string;
  code: string;
  name: string;
  source: ArrivalSource;
  reason: string | null;
  grantedAt: Date;
}

export type ArrivalOrigin = "welcome" | "gift" | "tier" | "mixed";

/** Los sobres gratis y los del día 7 los pide el coleccionista: no son llegadas. Los anulados tampoco. */
export function isArrival(p: { source: string; status: string }): boolean {
  return p.status === "sealed" && (ARRIVAL_SOURCES as readonly string[]).includes(p.source);
}

export function originOf(p: Pick<ArrivalPack, "source" | "reason">): Exclude<ArrivalOrigin, "mixed"> {
  if (p.source === "tier_grant") return "tier";
  if (p.source === "promo" && p.reason === "welcome") return "welcome";
  return "gift";
}

export interface ArrivalsGroup {
  total: number;
  ids: string[];
  /** Por colección, en orden de código. */
  sets: { setId: string; code: string; name: string; count: number }[];
  origin: ArrivalOrigin;
}

/** RF-6: una sola celebración que junta todas las llegadas pendientes. */
export function groupArrivals(packs: readonly ArrivalPack[]): ArrivalsGroup | null {
  if (packs.length === 0) return null;
  const sets = new Map<string, ArrivalsGroup["sets"][number]>();
  for (const p of packs) {
    const s = sets.get(p.setId) ?? { setId: p.setId, code: p.code, name: p.name, count: 0 };
    s.count += 1;
    sets.set(p.setId, s);
  }
  const origins = new Set(packs.map(originOf));
  return {
    total: packs.length,
    ids: packs.map((p) => p.id),
    sets: [...sets.values()].sort((a, b) => a.code.localeCompare(b.code)),
    origin: origins.size === 1 ? [...origins][0] : "mixed",
  };
}

/** Identidad de la celebración: las mismas llegadas no se encolan dos veces. */
export const arrivalsKey = (ids: readonly string[]) => `arrivals:${[...ids].sort().join(",")}`;

/** RF-8: cuántas llegadas sin ver tiene cada colección (las posteriores a la última visita a «Mis sobres»). */
export function newArrivalsBySet(packs: readonly ArrivalPack[], seenAt: Date | null): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of packs) {
    if (seenAt && p.grantedAt.getTime() <= seenAt.getTime()) continue;
    out.set(p.setId, (out.get(p.setId) ?? 0) + 1);
  }
  return out;
}
