import { cookies } from "next/headers";
import { db } from "@/db/client";
import { requireUser } from "@/server/auth/require-user";
import { now } from "@/server/clock";
import { claimableSets, rewardsSummary } from "@/server/services/rewards";
import { packArtForSets } from "@/server/services/pack-art";
import { RewardsPanel } from "@/features/rewards/RewardsPanel";
import { getDict } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getDict()).common.shell.rewards };
}

/** Spec 010, RF-2: sección propia de recompensas (sobre gratis y racha diaria de la spec 009). */
export default async function RecompensasPage() {
  const user = await requireUser("/recompensas");
  const tz = (await cookies()).get("wb_tz")?.value ?? null;
  const at = now();
  const [rw, plainSets, t] = await Promise.all([rewardsSummary(db, user.id, { now: at, timeZone: tz }), claimableSets(db), getDict()]);
  // Spec 015, RF-5: el sobre de la colección elegida sale en la celebración del día 7.
  const art = await packArtForSets(
    db,
    plainSets.map((s) => s.id),
  );
  const sets = plainSets.map((s) => ({ ...s, art: art.get(s.id) ?? { coverVersion: null, packImage: null } }));
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-bold md:text-3xl">{t.common.shell.rewards}</h1>
      <RewardsPanel
        data={{
          serverNow: at.toISOString(),
          free: { ...rw.free, nextAt: rw.free.nextAt?.toISOString() ?? null },
          daily: rw.daily,
          cookies: rw.cookies,
          sets,
          timeZoneCookie: tz,
        }}
      />
    </main>
  );
}
