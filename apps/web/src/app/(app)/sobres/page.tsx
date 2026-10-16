import Link from "next/link";
import { db } from "@/db/client";
import { requireUser } from "@/server/auth/require-user";
import { cookies } from "next/headers";
import { now } from "@/server/clock";
import { listMyPacks, pendingOpening } from "@/server/services/packs";
import { claimableSets, rewardsSummary } from "@/server/services/rewards";
import { RewardsPanel } from "@/features/rewards/RewardsPanel";
import { getDict } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getDict()).packs.meta.myPacks };
}

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
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold md:text-3xl">{t.packs.mine.heading}</h1>
          <p className="text-ui-text-2">{total === 0 ? t.packs.mine.none : t.packs.mine.sealed(total)}</p>
        </div>

        {pending && (
          <Link
            href={`/sobres/${pending.setId}?pack=${pending.packId}`}
            className="block rounded-xl border border-ui-accent/50 bg-ui-accent/10 p-4 text-sm hover:bg-ui-accent/15"
            data-testid="pending-opening"
          >
            {t.packs.mine.pending} <span className="underline">{t.packs.mine.pendingLink}</span>
          </Link>
        )}

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ui-line p-10 text-center text-ui-text-2">
            {t.packs.mine.empty}{" "}
            <Link href="/drop-rates" className="text-ui-accent-text underline">
              {t.packs.mine.emptyLink}
            </Link>
            .
          </div>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {groups.map((g, i) => (
              <li
                key={g.setId}
                style={{ "--i": i } as React.CSSProperties}
                className="card-in flex gap-5 rounded-xl bg-ui-nav bg-[radial-gradient(120%_120%_at_0%_50%,rgb(214_51_108/0.18),transparent_60%)] p-5"
                data-testid={`group-${g.code}`}
              >
                <PackArt code={g.code} count={g.sealed} />
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-ui-text-3">{g.code}</p>
                      <h2 className="truncate text-lg font-semibold">{g.name}</h2>
                    </div>
                    <span className="rounded-full bg-ui-hover px-3 py-1 text-sm font-semibold tabular-nums">x{g.sealed}</span>
                  </div>
                  {g.locked ? (
                    <p className="text-sm text-rose-200">{t.packs.mine.locked}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/sobres/${g.setId}`} className="btn btn-primary px-5 py-2 text-sm">
                        {t.packs.mine.openOne}
                      </Link>
                      {g.sealed > 1 && (
                        <Link href={`/sobres/${g.setId}/todos`} className="btn btn-secondary px-5 py-2 text-sm">
                          {t.packs.mine.openAll(Math.min(g.sealed, 50))}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-ui-text-3">{t.common.aiNotice}</p>
      </div>

      <aside className="min-w-0">
        <RewardsPanel
          layout="stack"
          data={{
            serverNow: at.toISOString(),
            free: { ...rw.free, nextAt: rw.free.nextAt?.toISOString() ?? null },
            daily: rw.daily,
            cookies: rw.cookies,
            sets,
            timeZoneCookie: tz,
          }}
        />
      </aside>
    </main>
  );
}

/** Sobre en miniatura con su pila: ilustra cuántos quedan (spec 010, maqueta «Mis sobres»). */
function PackArt({ code, count }: { code: string; count: number }) {
  return (
    <div aria-hidden className="relative h-[132px] w-[92px] shrink-0">
      {count > 2 && <span className="absolute inset-0 translate-x-2 -rotate-6 rounded-lg bg-ui-hover" />}
      {count > 1 && <span className="absolute inset-0 translate-x-1 -rotate-3 rounded-lg bg-ui-raised" />}
      <span className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-lg border-2 border-[#f5c451] bg-gradient-to-br from-ui-accent via-[#7a1f45] to-ui-rail p-2 shadow-[0_10px_24px_rgb(0_0_0/0.45)]">
        <span className="h-1 rounded-full bg-white/40" />
        <span className="font-display text-sm font-bold leading-tight text-white">{code}</span>
      </span>
    </div>
  );
}
