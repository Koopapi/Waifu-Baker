// Spec 020, RF-30: simulador del panel. Lo esperado de una zona con un equipo y una duración, y una tirada con
// semilla de muchos reclamos para comprobar la probabilidad de sobre.
import { seededRng } from "@/domain/random";
import { rollPack } from "./report";
import { SLOTS, lootFor, rateTeam, teamPower, type DurationLoot, type DurationMin, type Rating, type TeamMember, type Terrain, type ZoneLoot } from "./rules";

export interface SimulationResult {
  power: number;
  rating: Rating;
  loot: DurationLoot;
  /** Un coleccionista que usa sus 2 espacios todo el día con esta duración. */
  expeditionsPerDay: number;
  cookiesPerDay: number;
  fragmentsPerDay: number;
  packsPerDay: number;
  /** Proporción de reclamos con sobre en la simulación. */
  simulatedPackRate: number;
  runs: number;
}

export function simulate(
  zone: { terrain: Terrain; difficulty: number; loot: ZoneLoot },
  team: readonly TeamMember[],
  duration: DurationMin,
  opts: { runs?: number; seed?: number } = {},
): SimulationResult {
  const power = teamPower(team, zone.terrain);
  const rating = rateTeam(power, zone.difficulty);
  const loot = lootFor(zone.loot[`${duration}`], rating, team.map((m) => m.role));
  const expeditionsPerDay = SLOTS * ((24 * 60) / duration);
  const runs = Math.max(1, Math.min(100_000, opts.runs ?? 10_000));
  const rng = seededRng(opts.seed ?? 1);
  let wins = 0;
  for (let i = 0; i < runs; i++) if (rollPack(rng, loot.packChance)) wins++;
  return {
    power,
    rating,
    loot,
    expeditionsPerDay,
    cookiesPerDay: loot.cookies * expeditionsPerDay,
    fragmentsPerDay: loot.fragments * expeditionsPerDay,
    packsPerDay: loot.packChance * expeditionsPerDay,
    simulatedPackRate: wins / runs,
    runs,
  };
}
