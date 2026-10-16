import Link from "next/link";
import { db } from "@/db/client";
import { requireUser } from "@/server/auth/require-user";
import { cookies } from "next/headers";
import { now } from "@/server/clock";
import { listMyPacks, pendingOpening } from "@/server/services/packs";
import { claimableSets, rewardsSummary } from "@/server/services/rewards";
import { RewardsPanel } from "@/features/rewards/RewardsPanel";
import { getDict } from "@/i18n/server";

/** RF-1, RF-3 y RF-17: sobres sin abrir por colección y aviso de apertura sin terminar. */
export default async function MisSobresPage() {
  const user = await requireUser("/sobres");
  const tz = (await cookies()).get("wb_tz")?.value ?? null;
  const at = now();
  const [groups, pending, rw, sets] = await Promise.all([
    listMyPacks(db, user.id),
    pendingOpening(db, user.id),
    rewardsSummary(db, user.id, { now: at, timeZone: tz }),
    claimableSets(db),
  ]);
  const total = groups.reduce((a, g) => a + g.sealed, 0);
  const t = await getDict();

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">{t.packs.mine.heading}</h1>
        <p className="text-white/60">{total === 0 ? t.packs.mine.none : t.packs.mine.sealed(total)}</p>
      </div>

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

      {pending && (
        <Link
          href={`/sobres/${pending.setId}?pack=${pending.packId}`}
          className="block rounded-2xl border border-[#d6b370]/50 bg-[#d6b370]/10 p-4 text-sm hover:bg-[#d6b370]/15"
          data-testid="pending-opening"
        >
          {t.packs.mine.pending} <span className="underline">{t.packs.mine.pendingLink}</span>
        </Link>
      )}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/60">
          {t.packs.mine.empty}{" "}
          <Link href="/drop-rates" className="underline">
            {t.packs.mine.emptyLink}
          </Link>
          .
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.setId} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#3a1c6f]/60 to-[#120d1d] p-5" data-testid={`group-${g.code}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-white/50">{g.code}</p>
                  <h2 className="text-lg font-semibold">{g.name}</h2>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold tabular-nums">x{g.sealed}</span>
              </div>
              {g.locked ? (
                <p className="text-sm text-rose-200">
                  {t.packs.mine.locked}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/sobres/${g.setId}`} className="rounded-full bg-[#d6b370] px-5 py-2 text-sm font-semibold text-[#0b0c0e]">
                    {t.packs.mine.openOne}
                  </Link>
                  {g.sealed > 1 && (
                    <Link href={`/sobres/${g.setId}/todos`} className="rounded-full border border-white/20 px-5 py-2 text-sm">
                      {t.packs.mine.openAll(Math.min(g.sealed, 50))}
                    </Link>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-white/40">{t.common.aiNotice}</p>
    </main>
  );
}
