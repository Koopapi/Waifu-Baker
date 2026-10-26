// Spec 001: estado de un miembro de Patreon y los sobres a los que da derecho. Puro.

export type PatronStatus = "active_patron" | "declined_patron" | "former_patron" | null;

export interface MemberState {
  memberId: string | null;
  patreonUserId: string;
  patronStatus: PatronStatus;
  lastChargeDate: Date | null;
  lastChargeStatus: string | null;
  nextChargeDate: Date | null;
  entitledTierIds: string[];
}

export interface RuleForGrant {
  patreonTierId: string;
  setId: string;
  packsPerMonth: number;
  active: boolean;
  setIsAdult: boolean;
  /** La colección está publicada (solo así se conceden sobres). */
  setGrantable: boolean;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * RF-11: el ciclo de cobro. La fecha del siguiente cobro no cambia al subir de tier a mitad de mes;
 * si Patreon no la da, se usa la del último cobro.
 */
export function cycleKey(s: Pick<MemberState, "nextChargeDate" | "lastChargeDate">): string | null {
  if (s.nextChargeDate) return day(s.nextChargeDate);
  if (s.lastChargeDate) return `last-${day(s.lastChargeDate)}`;
  return null;
}

/** RF-9 y RF-13: solo un patron activo con el último cobro pagado tiene derecho a sobres. */
export function isPaidActive(s: MemberState) {
  return s.patronStatus === "active_patron" && s.lastChargeStatus === "Paid" && cycleKey(s) !== null;
}

/** RF-9: sobres por colección de este ciclo, sumando las reglas activas de todos sus tiers. */
export function entitledPacks(s: MemberState, rules: RuleForGrant[]): Map<string, number> {
  const out = new Map<string, number>();
  if (!isPaidActive(s)) return out;
  const tiers = new Set(s.entitledTierIds);
  for (const r of rules) {
    if (!r.active || !r.setGrantable || !tiers.has(r.patreonTierId) || r.packsPerMonth <= 0) continue;
    out.set(r.setId, (out.get(r.setId) ?? 0) + r.packsPerMonth);
  }
  return out;
}

/**
 * RF-10 y RF-11: claves 1..total de un ciclo y colección. Subir de tier añade las que faltan; bajar
 * y volver a subir repite las mismas, así que nunca se concede dos veces.
 */
export function grantKeys(patreonUserId: string, cycle: string, setId: string, total: number) {
  return Array.from({ length: total }, (_, i) => `tier:${patreonUserId}:${cycle}:${setId}:${i + 1}`);
}

const VOIDABLE = new Set(["Refunded", "Refunded by Patreon", "Fraud", "Partially Refunded"]);

/** RF-14: estados de cobro que anulan los sobres sin abrir de ese ciclo. */
export function isVoidableCharge(status: string | null | undefined) {
  return VOIDABLE.has(status ?? "");
}

/** RF-18: un tier es adulto si da sobres de alguna colección 18+. */
export function hasAdultTier(s: Pick<MemberState, "entitledTierIds">, rules: RuleForGrant[]) {
  const tiers = new Set(s.entitledTierIds);
  return rules.some((r) => r.active && r.setIsAdult && tiers.has(r.patreonTierId));
}

/**
 * Spec 021: patron = membresía activa con el último cobro pagado y al menos una regla activa con sobres para alguno
 * de sus tiers. Un tier sin reglas (por ejemplo «Free») no hace patron a nadie.
 */
export function isPatron(s: MemberState | null, rules: RuleForGrant[]) {
  if (!s || !isPaidActive(s)) return false;
  const tiers = new Set(s.entitledTierIds);
  return rules.some((r) => r.active && r.packsPerMonth > 0 && tiers.has(r.patreonTierId));
}
