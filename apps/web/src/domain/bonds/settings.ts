// Spec 029, RF-2, RF-14, RF-18 y RF-22: valores del reciclaje, del polvo, de fabricar y de los títulos del vínculo. Los
// de fábrica son los de la spec; el panel los cambia y, si lo guardado falta o no vale, valen estos. Puro.
import { z } from "zod";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";

export type CraftableRarity = Exclude<Rarity, "ex">;
export const CRAFTABLE: CraftableRarity[] = ["common", "rare", "epic", "legendary"];
/** RF-14: niveles con título (el título vale hasta el siguiente hito). */
export const TITLE_LEVELS = [2, 3, 5, 7, 10] as const;
export type TitleLevel = (typeof TITLE_LEVELS)[number];

export interface BondSettings {
  /** Puntos de vínculo por copia reciclada (RF-2). */
  points: Record<Rarity, number>;
  /** Polvo completo por copia (al reciclar se da la mitad mientras el vínculo no esté al máximo, RF-2 y RF-3). */
  dust: Record<Rarity, number>;
  /** Multiplicador de la versión holo para puntos y polvo. */
  holoFactor: number;
  /** Coste de fabricar por rareza (la EX no se fabrica, RF-19). */
  craftCost: Record<CraftableRarity, number>;
  /** Títulos personalizados por hito; vacío = el del idioma (RF-14). */
  titles: Partial<Record<`${TitleLevel}`, string>>;
}

export const FACTORY_BOND_SETTINGS: BondSettings = {
  points: { common: 10, rare: 25, epic: 60, legendary: 150, ex: 400 },
  dust: { common: 5, rare: 15, epic: 40, legendary: 120, ex: 300 },
  holoFactor: 1.5,
  craftCost: { common: 100, rare: 300, epic: 800, legendary: 2500 },
  titles: {},
};

const amount = z.number().int().min(0).max(100_000);
const byRarity = z.object(Object.fromEntries(RARITIES.map((r) => [r, amount])) as Record<Rarity, typeof amount>);
const cost = z.number().int().min(1).max(1_000_000);
export const bondSettingsSchema = z.object({
  points: byRarity,
  dust: byRarity,
  holoFactor: z.number().finite().min(1).max(5),
  craftCost: z.object(Object.fromEntries(CRAFTABLE.map((r) => [r, cost])) as Record<CraftableRarity, typeof cost>),
  titles: z.object(Object.fromEntries(TITLE_LEVELS.map((l) => [String(l), z.string().trim().max(30).optional()])) as Record<`${TitleLevel}`, z.ZodOptional<z.ZodString>>),
});

/** Lo guardado en los ajustes, o los de fábrica si falta o no es válido. Los títulos vacíos se quitan. */
export function parseBondSettings(value: unknown): BondSettings {
  const r = bondSettingsSchema.safeParse(value);
  if (!r.success) return structuredClone(FACTORY_BOND_SETTINGS);
  const titles = Object.fromEntries(Object.entries(r.data.titles).filter(([, v]) => v)) as BondSettings["titles"];
  return { ...r.data, titles };
}
