// Spec 033: filtros, búsqueda y orden de la cuadrícula de cartas de una colección del panel. Reglas puras.
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";

export const PENDING_KINDS = ["unassembled", "processing", "layers_review", "adult_review"] as const;
export type PendingKind = (typeof PENDING_KINDS)[number];
export const SORTS = ["number", "rarity", "name"] as const;
export type CardSort = (typeof SORTS)[number];
/** RF-1: el id de personaje para las cartas sin personaje. */
export const NO_CHARACTER = "none";

export type CardFilters = { characters: string[]; rarities: Rarity[]; pending: PendingKind[]; q: string; sort: CardSort };
export const NO_FILTERS: CardFilters = { characters: [], rarities: [], pending: [], q: "", sort: "number" };

/** Lo que las reglas necesitan de una carta de la cuadrícula. */
export type FilterableCard = {
  number: number;
  name: string | null;
  rarity: Rarity | null;
  characterId: string | null;
  status: string;
  assembled: boolean;
  adultReviewedAt: string | null;
  pendingArtUrl: string | null;
  pendingLayersUrl: string | null;
};

/** RF-3: lo que le falta a una carta (la regla de 18+ es la del aviso de la página). */
export function pendingOf(c: FilterableCard, isAdultSet: boolean): PendingKind[] {
  const out: PendingKind[] = [];
  if (!c.assembled) out.push("unassembled");
  if (c.status !== "ready") out.push("processing");
  if (c.pendingLayersUrl) out.push("layers_review");
  if (isAdultSet && (!c.adultReviewedAt || c.pendingArtUrl || c.pendingLayersUrl)) out.push("adult_review");
  return out;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** RF-7: el nombre contiene el texto (sin mayúsculas ni acentos), o el texto es el número («12» y «012»). */
export function matchesQuery(c: FilterableCard, q: string): boolean {
  const text = q.trim();
  if (!text) return true;
  if (/^\d+$/.test(text) && Number(text) === c.number) return true;
  return fold(c.name ?? "").includes(fold(text));
}

/** RF-5 y RF-6: dentro de un filtro, cualquiera de sus opciones; entre filtros, todos. */
export function matches(c: FilterableCard, f: CardFilters, isAdultSet: boolean): boolean {
  if (f.characters.length && !f.characters.includes(c.characterId ?? NO_CHARACTER)) return false;
  if (f.rarities.length && !(c.rarity && f.rarities.includes(c.rarity))) return false;
  if (f.pending.length) {
    const mine = pendingOf(c, isAdultSet);
    if (!f.pending.some((p) => mine.includes(p))) return false;
  }
  return matchesQuery(c, f.q);
}

const rank = (r: Rarity | null) => (r ? RARITIES.indexOf(r) : -1);

/** RF-10 y RF-11: ordena una copia de la vista; el número de las cartas no cambia. */
export function sortCards<T extends FilterableCard>(cards: readonly T[], sort: CardSort): T[] {
  const byNumber = (a: T, b: T) => a.number - b.number;
  const list = [...cards];
  if (sort === "rarity") return list.sort((a, b) => rank(b.rarity) - rank(a.rarity) || byNumber(a, b));
  if (sort === "name")
    return list.sort((a, b) => {
      // Las cartas sin nombre van al final, por número.
      if (!a.name || !b.name) return a.name ? -1 : b.name ? 1 : byNumber(a, b);
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || byNumber(a, b);
    });
  return list.sort(byNumber);
}

/** RF-1 a RF-11: las cartas que se ven, en el orden elegido. */
export function visibleCards<T extends FilterableCard>(cards: readonly T[], f: CardFilters, isAdultSet: boolean): T[] {
  return sortCards(
    cards.filter((c) => matches(c, f, isAdultSet)),
    f.sort,
  );
}

/** RF-4: cuántas cartas de la colección tiene cada opción. */
export function optionCounts(cards: readonly FilterableCard[], isAdultSet: boolean) {
  const characters: Record<string, number> = {};
  const rarities = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
  const pending = Object.fromEntries(PENDING_KINDS.map((p) => [p, 0])) as Record<PendingKind, number>;
  for (const c of cards) {
    const ch = c.characterId ?? NO_CHARACTER;
    characters[ch] = (characters[ch] ?? 0) + 1;
    if (c.rarity) rarities[c.rarity]++;
    for (const p of pendingOf(c, isAdultSet)) pending[p]++;
  }
  return { characters, rarities, pending };
}

/** RF-8: hay algún filtro o búsqueda (el orden no cuenta). */
export const isFiltered = (f: CardFilters) => f.characters.length > 0 || f.rarities.length > 0 || f.pending.length > 0 || f.q.trim() !== "";

/** Cuántos filtros hay puestos (para el botón «Filtros» del teléfono). */
export const activeFilterCount = (f: CardFilters) => f.characters.length + f.rarities.length + f.pending.length + (f.q.trim() ? 1 : 0);

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const only = <T extends string>(values: string[], allowed: readonly T[]) => [...new Set(values.filter((v): v is T => (allowed as readonly string[]).includes(v)))];

/** RF-17 y RF-18: los filtros de la dirección; lo que no existe en la colección se ignora. */
export function parseFilters(params: { get(name: string): string | null }, ctx: { characterIds: readonly string[]; isAdultSet: boolean }): CardFilters {
  const pending = only(list(params.get("pending")), PENDING_KINDS).filter((p) => p !== "adult_review" || ctx.isAdultSet);
  const sort = params.get("sort");
  return {
    characters: only(list(params.get("character")), [...ctx.characterIds, NO_CHARACTER]),
    rarities: only(list(params.get("rarity")), RARITIES),
    pending,
    q: (params.get("q") ?? "").slice(0, 80),
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as CardSort) : "number",
  };
}

/** RF-16 y RF-19: los filtros para la dirección; sin filtros, la dirección queda limpia. */
export function filtersToParams(f: CardFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.characters.length) p.set("character", f.characters.join(","));
  if (f.rarities.length) p.set("rarity", f.rarities.join(","));
  if (f.pending.length) p.set("pending", f.pending.join(","));
  if (f.q.trim()) p.set("q", f.q);
  if (f.sort !== "number") p.set("sort", f.sort);
  return p;
}
