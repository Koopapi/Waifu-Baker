"use server";

import { auth } from "@/auth";
import { db } from "@/db/client";
import { now } from "@/server/clock";
import { markCelebrated, markPacksSeen } from "@/server/services/arrivals";

/** Spec 015, RF-7: la celebración de llegadas se ha mostrado; no vuelve a salir. */
export async function markCelebratedAction(packIds: string[]) {
  const userId = (await auth())?.user?.id;
  if (!userId) return;
  await markCelebrated(db, userId, packIds, now());
}

/** Spec 015, RF-8: el coleccionista ha visto «Mis sobres»; las llegadas de hasta ahora dejan de ser nuevas. */
export async function markPacksSeenAction() {
  const userId = (await auth())?.user?.id;
  if (!userId) return;
  await markPacksSeen(db, userId, now());
}
