"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { requireAdmin } from "@/server/auth/require-admin";
import { db } from "@/db/client";
import { DURATIONS, type DurationMin, type TeamMember, type Terrain, type ZoneLoot } from "@/domain/expeditions/rules";
import { gamesDictionaries } from "@/i18n/games";
import { translateError } from "@/i18n/errors";
import { getDict, getLocale } from "@/i18n/server";
import { isAdminError } from "@/server/errors";
import { saveZone, simulateZone } from "@/server/services/expedition-zones";

const PATHS = ["/admin/expeditions", "/games/expeditions", "/drop-rates"];
const num = (fd: FormData, k: string) => Number(String(fd.get(k) ?? "").replace(",", ".").trim() || NaN);

/** Spec 020, RF-28 y RF-29: crea o edita una zona con su botín por duración (la probabilidad llega en %). */
export async function saveZoneAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("saveZone", PATHS, async ({ db, actorId }) => {
    const loot = {} as ZoneLoot;
    for (const d of DURATIONS) loot[`${d}`] = { cookies: num(fd, `cookies_${d}`), fragments: num(fd, `fragments_${d}`), packChance: num(fd, `pack_${d}`) / 100 };
    const id = String(fd.get("id") ?? "") || undefined;
    const z = await saveZone(db, actorId, {
      id,
      name: String(fd.get("name") ?? ""),
      terrain: String(fd.get("terrain") ?? "") as Terrain,
      difficulty: num(fd, "difficulty"),
      fragmentsRequired: num(fd, "fragmentsRequired"),
      sortOrder: num(fd, "sortOrder"),
      active: fd.get("active") === "on",
      loot,
    });
    const t = gamesDictionaries[await getLocale()].admin;
    return id ? t.saved : t.created(z.name);
  });
}

export type SimulationState = { ok: true; result: Awaited<ReturnType<typeof simulateZone>> } | { ok: false; error: string };

/** Spec 020, RF-30: simulador del panel. */
export async function simulateZoneAction(zoneId: string, team: TeamMember[], duration: DurationMin): Promise<SimulationState> {
  await requireAdmin("action:simulateZone");
  try {
    return { ok: true, result: await simulateZone(db, zoneId, team, duration, { runs: 10_000, seed: Date.now() % 1_000_000 }) };
  } catch (e) {
    if (isAdminError(e)) return { ok: false, error: translateError(await getDict(), e) };
    throw e;
  }
}
