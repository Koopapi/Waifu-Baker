// Spec 028, RF-16 y RF-17: validación de las probabilidades iniciales y de las garantías que el administrador guarda en
// los ajustes del panel. Puro.
import { z } from "zod";
import { RARITIES } from "./card-rules";
import { FACTORY_ODDS_TABLES, FACTORY_PITY, PACK_KINDS, PITY_RANGE, TABLE_ROWS, defaultSlots, type OddsTables, type PackKind, type PityDefaults, type TableRow } from "./default-odds";
import { validateOdds } from "./odds";

const weight = z.number().finite().min(0).max(100);
const row = z.object(Object.fromEntries(RARITIES.map((r) => [r, weight])) as Record<(typeof RARITIES)[number], typeof weight>);
const kindTable = z.object({ base: row, boosted: row, guaranteed: row });
export const oddsTablesSchema = z.object({ silver: kindTable, gold: kindTable });

const pityValue = z.number().int().min(PITY_RANGE.min).max(PITY_RANGE.max);
export const pityDefaultsSchema = z.object({ epic: pityValue, ex: pityValue });

/** Qué fila de qué sobre falla (RF-16: «indicará cuál falla»). `guarantee`: la última ranura da menos que su garantía. */
export interface TableProblem {
  kind: PackKind;
  row: TableRow;
  code: "slot_sum" | "negative_weight" | "guarantee_slot";
  sum?: number;
}

/** RF-16: cada fila debe sumar 100 y la última respetar la garantía del sobre (rara o mejor en plata, épica en gold). */
export function oddsTablesProblems(tables: OddsTables): TableProblem[] {
  const out: TableProblem[] = [];
  for (const kind of PACK_KINDS) {
    // Un sobre de 3 cartas tiene exactamente las tres filas: normal, mejorada y última.
    const slots = defaultSlots(3, kind, tables);
    for (const p of validateOdds(slots, 3, 0, kind)) {
      if (p.target.kind !== "slot") continue;
      if (p.code !== "slot_sum" && p.code !== "negative_weight" && p.code !== "guarantee_slot") continue;
      out.push({ kind, row: TABLE_ROWS[p.target.index], code: p.code, ...(p.code === "slot_sum" ? { sum: Number(p.params?.sum) } : {}) });
    }
  }
  return out;
}

/** Lo guardado en los ajustes, o las tablas de fábrica si falta o no es válido. */
export function parseOddsTables(value: unknown): OddsTables {
  const r = oddsTablesSchema.safeParse(value);
  return r.success && oddsTablesProblems(r.data).length === 0 ? r.data : structuredClone(FACTORY_ODDS_TABLES);
}

export function parsePityDefaults(value: unknown): PityDefaults {
  const r = pityDefaultsSchema.safeParse(value);
  return r.success ? r.data : { ...FACTORY_PITY };
}
