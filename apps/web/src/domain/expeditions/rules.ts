// Spec 020: reglas de Expediciones (poder, calificación, botín fijo y vínculo). Puro: el servidor las usa para decidir
// y la web para enseñar la calificación esperada mientras se arma el equipo.
import type { Rarity } from "@/domain/catalog/card-rules";

export const TERRAINS = ["city", "forest", "coast", "ruins", "mountain"] as const;
export type Terrain = (typeof TERRAINS)[number];

/** Solo los roles que cambian el botín (Guardiana y Carismática dependen de eventos que quedan fuera). */
export const ROLES = ["gatherer", "cartographer", "treasure_hunter"] as const;
export type Role = (typeof ROLES)[number];

export const DURATIONS = [30, 120, 480] as const;
export type DurationMin = (typeof DURATIONS)[number];
export const isDuration = (n: unknown): n is DurationMin => DURATIONS.includes(n as DurationMin);

export const SLOTS = 2;
/** Spec 021, RF-13: el patron tiene un espacio más. */
export const PATRON_SLOTS = 3;
export const slotsFor = (patron: boolean) => (patron ? PATRON_SLOTS : SLOTS);
export const TEAM_MAX = 3;

/** RF-11: con el terreno a ×1.5, una carta en su terreno supera a otra dos rarezas por encima fuera del suyo. */
export const RARITY_POWER: Record<Rarity, number> = { common: 10, uncommon: 12, rare: 14, epic: 17, legendary: 20, secret: 24 };
export const TERRAIN_BONUS = 1.5;
export const HOLO_BONUS = 1.15;
export const BOND_BONUS_PER_LEVEL = 0.02;

export interface TeamMember {
  rarity: Rarity;
  holo: boolean;
  terrain: Terrain | null;
  role: Role | null;
  bondLevel: number;
}

/** RF-11 a RF-13: poder de una carta en una zona. */
export function cardPower(m: TeamMember, zoneTerrain: Terrain): number {
  const terrain = m.terrain === zoneTerrain ? TERRAIN_BONUS : 1;
  const holo = m.holo ? HOLO_BONUS : 1;
  return RARITY_POWER[m.rarity] * terrain * holo * (1 + BOND_BONUS_PER_LEVEL * (m.bondLevel - 1));
}

export function teamPower(team: readonly TeamMember[], zoneTerrain: Terrain): number {
  return team.reduce((sum, m) => sum + cardPower(m, zoneTerrain), 0);
}

export const RATINGS = ["hard", "normal", "good", "excellent"] as const;
export type Rating = (typeof RATINGS)[number];
export const RATING_LOOT: Record<Rating, number> = { hard: 0.5, normal: 0.8, good: 1, excellent: 1.25 };

/** RF-14: calificación por la proporción entre el poder del equipo y la dificultad de la zona. */
export function rateTeam(power: number, difficulty: number): Rating {
  const r = power / Math.max(1, difficulty);
  if (r >= 1.4) return "excellent";
  if (r >= 1) return "good";
  if (r >= 0.6) return "normal";
  return "hard";
}

/** Botín de una duración con calificación «Bien»; lo fija el administrador por zona (RF-29). */
export interface DurationLoot {
  cookies: number;
  fragments: number;
  /** Probabilidad de ganar un sobre al reclamar (0 a 1). */
  packChance: number;
}
export type ZoneLoot = Record<`${DurationMin}`, DurationLoot>;

export const ROLE_EFFECT = { gatherer: 1.3, cartographer: 2, treasure_hunter: 1.5 } as const;

/** RF-14, RF-20 y RF-21: botín fijo de una calificación, con el efecto de cada rol presente en el equipo (una vez). */
export function lootFor(base: DurationLoot, rating: Rating, roles: readonly (Role | null)[]): DurationLoot {
  const has = (r: Role) => roles.includes(r);
  const mult = RATING_LOOT[rating];
  const cookies = base.cookies > 0 ? Math.max(1, Math.floor(base.cookies * mult * (has("gatherer") ? ROLE_EFFECT.gatherer : 1) + 1e-9)) : 0;
  const fragments = Math.floor(base.fragments * mult + 1e-9) * (has("cartographer") ? ROLE_EFFECT.cartographer : 1);
  const packChance = Math.min(1, base.packChance * (has("treasure_hunter") ? ROLE_EFFECT.treasure_hunter : 1));
  return { cookies, fragments, packChance };
}

/** Experiencia de vínculo que gana cada personaje del equipo por duración. */
export const BOND_XP: Record<DurationMin, number> = { 30: 4, 120: 12, 480: 30 };
/** Experiencia acumulada para llegar a cada nivel (1 a 10). */
export const BOND_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1000, 1500, 2000, 2500] as const;

export function bondLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < BOND_THRESHOLDS.length; i++) if (xp >= BOND_THRESHOLDS[i]) level = i + 1;
  return level;
}

/** Nivel y tramo de experiencia hacia el siguiente (null en el nivel máximo). */
export function bondProgress(xp: number) {
  const level = bondLevel(xp);
  return { level, xp, from: BOND_THRESHOLDS[level - 1] as number, to: level < BOND_THRESHOLDS.length ? (BOND_THRESHOLDS[level] as number) : null };
}

/** Botín por defecto de una zona nueva según su dificultad (el administrador lo ajusta). */
export function defaultZoneLoot(difficulty: number): ZoneLoot {
  const k = Math.max(1, Math.round(difficulty / 30));
  return {
    "30": { cookies: 5 + k, fragments: 1, packChance: 0.01 },
    "120": { cookies: 15 + 3 * k, fragments: 2, packChance: 0.03 },
    "480": { cookies: 45 + 8 * k, fragments: 4, packChance: 0.08 },
  };
}
