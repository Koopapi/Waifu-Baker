// Spec 020, RF-21 y RF-24: lo que pasa al reclamar. El sobre al azar y las frases salen del RNG del servidor; las
// frases se guardan como clave de plantilla y orden de las personajes, y se pintan en el idioma de quien mira.
import type { Rng } from "@/domain/random";
import type { DurationMin, Terrain } from "./rules";

export interface PhraseTemplate {
  key: string;
  /** Cartas que nombra la frase ({a}, {b}, {c}). */
  minTeam: 1 | 2 | 3;
  /** Solo en zonas de este terreno; null = en cualquiera. */
  terrain: Terrain | null;
}

const general = (minTeam: 1 | 2 | 3, n: number): PhraseTemplate[] => Array.from({ length: n }, (_, i) => ({ key: `g${minTeam}_${i + 1}`, minTeam, terrain: null }));
const ofTerrain = (terrain: Terrain): PhraseTemplate[] => [
  { key: `${terrain}_1`, minTeam: 1, terrain },
  { key: `${terrain}_2`, minTeam: 1, terrain },
  { key: `${terrain}_3`, minTeam: 2, terrain },
];

/** Los textos están en el diccionario de juegos (`games.expeditions.phrases`), con la misma clave. */
export const PHRASES: PhraseTemplate[] = [
  ...general(1, 8),
  ...general(2, 8),
  ...general(3, 6),
  ...ofTerrain("city"),
  ...ofTerrain("forest"),
  ...ofTerrain("coast"),
  ...ofTerrain("ruins"),
  ...ofTerrain("mountain"),
];

export interface PickedPhrase {
  key: string;
  /** Posición en el equipo de quien hace de {a}, {b} y {c}. */
  order: number[];
}

/** 1, 2 o 3 frases según la duración. */
export function phraseCount(duration: DurationMin): number {
  return duration === 30 ? 1 : duration === 120 ? 2 : 3;
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Frases distintas que caben en el equipo y en el terreno de la zona, con el orden de las personajes. */
export function pickPhrases(rng: Rng, opts: { count: number; teamSize: number; terrain: Terrain }): PickedPhrase[] {
  const pool = PHRASES.filter((p) => p.minTeam <= opts.teamSize && (p.terrain === null || p.terrain === opts.terrain));
  return shuffle(rng, pool)
    .slice(0, opts.count)
    .map((p) => ({ key: p.key, order: shuffle(rng, [...Array(opts.teamSize).keys()]) }));
}

/** RF-21: ¿sale un sobre? */
export function rollPack(rng: Rng, chance: number): boolean {
  return chance > 0 && rng.next() < chance;
}
