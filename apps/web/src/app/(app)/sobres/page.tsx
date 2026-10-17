import Link from "next/link";
import { db } from "@/db/client";
import { requireUser } from "@/server/auth/require-user";
import { cookies } from "next/headers";
import { now } from "@/server/clock";
import { listMyPacks, pendingOpening } from "@/server/services/packs";
import { packArtForSets } from "@/server/services/pack-art";
import { PackArt } from "@/features/packs/PackArt";
import { claimableSets, rewardsSummary } from "@/server/services/rewards";
import { RewardsPanel } from "@/features/rewards/RewardsPanel";
import { getDict } from "@/i18n/server";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { EmptyState } from "@/ui/feedback/EmptyState";

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
  const art = await packArtForSets(db, groups.map((g) => g.setId));
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
            className="block rounded-l border border-ui-accent/50 bg-ui-accent/10 p-4 text-sm hover:bg-ui-accent/15"
            data-testid="pending-opening"
          >
            {t.packs.mine.pending} <span className="underline">{t.packs.mine.pendingLink}</span>
          </Link>
        )}

        {groups.length === 0 ? (
          <EmptyState
            title={t.packs.mine.empty}
            action={
              <Button variant="secondary" asChild>
                <Link href="/drop-rates">{t.packs.mine.emptyLink}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {groups.map((g, i) => (
              <li
                key={g.setId}
                style={{ "--i": i } as React.CSSProperties}
                className="card-in flex flex-col items-center gap-5 rounded-xl border border-k-lavanda/20 bg-linear-to-b from-ui-raised to-ui-nav p-5 shadow-[var(--shadow-glow)] sm:flex-row sm:items-center"
                data-testid={`group-${g.code}`}
              >
                <div className="relative">
                  {/* Spec 014, RF-5 y RF-8: el sobre de la colección; detrás, la pila si hay más de uno. */}
                  {g.sealed > 1 && <span aria-hidden className="absolute inset-x-3 inset-y-6 translate-x-3 rotate-6 rounded-xl bg-k-lavanda/30" />}
                  <PackArt setId={g.setId} code={g.code} name={g.name} art={art.get(g.setId) ?? { coverVersion: null, packImage: null }} className="relative w-[200px] sm:w-[170px]" />
                </div>
                <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
                  <div className="flex items-start justify-center gap-3 sm:justify-between">
                    <div className="hidden min-w-0 sm:block">
                      <p className="font-mono text-xs text-ui-text-3">{g.code}</p>
                      <h2 className="truncate font-display text-xl font-semibold">{g.name}</h2>
                    </div>
                    <Badge tone="accent" className="tabular-nums">x{g.sealed}</Badge>
                  </div>
                  {g.locked ? (
                    <p className="text-sm text-ui-danger-text">{t.packs.mine.locked}</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Button size="lg" width="full" asChild>
                        <Link href={`/sobres/${g.setId}`}>{t.packs.mine.openOne}</Link>
                      </Button>
                      {g.sealed > 1 && (
                        <Button size="lg" width="full" variant="secondary" asChild>
                          <Link href={`/sobres/${g.setId}/todos`}>{t.packs.mine.openAll(Math.min(g.sealed, 50))}</Link>
                        </Button>
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
