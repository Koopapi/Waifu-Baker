// Spec 029, RF-18 a RF-20: fabricar con polvo una copia normal de una carta concreta. Puro: dice si se puede y por qué no.
import type { Rarity } from "@/domain/catalog/card-rules";
import type { BondSettings } from "./settings";

export type CraftProblem = "no_rarity" | "ex" | "monthly" | "unpublished" | "adult" | "dust";

export interface CraftInput {
  rarity: Rarity | null;
  /** Carta del mes (exclusiva de Premium, specs futuras): hoy ninguna lo es. */
  monthly?: boolean;
  setStatus: string;
  setIsAdult: boolean;
  adultUnlocked: boolean;
  dust: number;
}

/** El coste de fabricar la carta, o null si su rareza no se fabrica. */
export function craftCost(rarity: Rarity | null, s: BondSettings): number | null {
  if (!rarity || rarity === "ex") return null;
  return s.craftCost[rarity];
}

/** RF-19: el primer motivo por el que no se puede fabricar, o null. */
export function craftProblem(c: CraftInput, s: BondSettings): CraftProblem | null {
  if (!c.rarity) return "no_rarity";
  if (c.rarity === "ex") return "ex";
  if (c.monthly) return "monthly";
  if (c.setStatus !== "published") return "unpublished";
  if (c.setIsAdult && !c.adultUnlocked) return "adult";
  if (c.dust < s.craftCost[c.rarity]) return "dust";
  return null;
}
