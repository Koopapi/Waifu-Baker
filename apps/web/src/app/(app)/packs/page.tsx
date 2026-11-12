import Link from "next/link";
import { db } from "@/db/client";
import { requireUser } from "@/server/auth/require-user";
import { cookies } from "next/headers";
import { now } from "@/server/clock";
import { listMyPacks, pendingOpening } from "@/server/services/packs";
import { newArrivalsBySet } from "@/server/services/arrivals";
import { PackThumb } from "@/ui/game/sobre-capas/PackThumb";
import { packViewsFor, withSilverPacks } from "@/server/services/pack-designs";
import { packViewKey } from "@/domain/packs/view";
import { MarkPacksSeen } from "@/features/packs/MarkPacksSeen";
import { claimableSets, rewardsSummary } from "@/server/services/rewards";
import { RewardsPanel } from "@/features/rewards/RewardsPanel";
import { getDict } from "@/i18n/server";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { isPatronUser, patreonPageUrl } from "@/server/services/patron";
import { PatreonNotice } from "@/features/economy/PatreonNotice";
import { PackKindTag } from "@/features/packs/PackKindTag";

export async function generateMetadata() {
  return { title: (await getDict()).packs.meta.myPacks };
}

/** RF-1, RF-3 y RF-17: sobres sin abrir por colección y tipo (spec 022, RF-19) y aviso de apertura sin terminar. */
export default async function MisSobresPage() {
  const user = await requireUser("/packs");
  const tz = (await cookies()).get("wb_tz")?.value ?? null;
  const at = now();
  const [groups, pending, rw, plainSets, fresh] = await Promise.all([
    listMyPacks(db, user.id),
    pendingOpening(db, user.id),
    rewardsSummary(db, user.id, { now: at, timeZone: tz }),
    claimableSets(db),
    // Spec 015, RF-8: llegadas que el coleccionista aún no había visto.
    newArrivalsBySet(db, user.id),
  ]);
  const [views, sets] = await Promise.all([
    // Spec 030, RF-14 a RF-16: el sobre de cada grupo (su diseño o el básico) con su miniatura.
    packViewsFor(db, user.id, groups.map((g) => ({ setId: g.setId, kind: g.kind }))),
    // Spec 015, RF-5 y spec 037, RF-1: el sobre de la colección elegida, con su diseño, sale en la celebración del día 7.
    withSilverPacks(db, user.id, plainSets),
  ]);
  const total = groups.reduce((a, g) => a + g.sealed, 0);
  const t = await getDict();
  // Spec 021, RF-9.
  const patron = await isPatronUser(db, user.id);
  const patreonUrl = patreonPageUrl();

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold md:text-3xl">{t.packs.mine.heading}</h1>
          <p className="text-ui-text-2">{total === 0 ? t.packs.mine.none : t.packs.mine.sealed(total)}</p>
        </div>

        {pending && (
          <Link
            href={`/packs/${pending.setId}?pack=${pending.packId}`}
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
          // Cada tarjeta se adapta a su propio ancho (no al de la pantalla): pone el sobre al lado de los botones solo
          // si caben; si no, uno encima de otro. Así ningún botón se queda estrecho y con el texto fuera.
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,30rem),1fr))] gap-4">
            {groups.map((g, i) => {
              // Spec 022, RF-19: el sobre gold va en su propio grupo y sus enlaces lo piden con `?k=gold`.
              const k = g.kind === "gold" ? "?k=gold" : "";
              const view = views.get(packViewKey(g.setId, g.kind));
              return (
                <li
                  key={`${g.setId}-${g.kind}`}
                  style={{ "--i": i } as React.CSSProperties}
                  className="card-in @container rounded-xl border border-k-lavanda/20 bg-linear-to-b from-ui-raised to-ui-nav p-5 shadow-[var(--shadow-glow)]"
                  data-testid={`group-${g.code}${g.kind === "gold" ? "-gold" : ""}`}
                  data-kind={g.kind}
                >
                  <div className="flex flex-col items-center gap-5 @sm:flex-row">
                    <div className="relative shrink-0">
                      {/* Spec 030, RF-16: el sobre de su colección y tipo en miniatura; detrás, la pila si hay más de uno. */}
                      {g.sealed > 1 && <span aria-hidden className="absolute inset-x-4 inset-y-8 translate-x-3 rotate-6 rounded-xl bg-k-lavanda/30" />}
                      {view && (
                        <PackThumb
                          registro={view.registro}
                          thumb={view.thumb}
                          label={`${g.name} (${g.code}) · ${t.common.packKind[g.kind]}`}
                          textos={{ carta: t.packs.sobre.card, cartas: t.packs.sobre.cards }}
                          className="relative w-[150px] @sm:w-[128px]"
                          data={{ "data-kind": g.kind, "data-designed": view.designed ? "true" : undefined, "data-art": view.designed ? undefined : String(view.registro.capas[0]?.src ?? ""), "data-testid": "pack-thumb" }}
                        />
                      )}
                    </div>
                    <div className="flex w-full max-w-xs min-w-0 flex-1 flex-col gap-4 @sm:max-w-none">
                      <div className="flex items-start justify-center gap-3 @sm:justify-between">
                        <div className="hidden min-w-0 @sm:block">
                          <p className="font-mono text-xs text-ui-text-3">{g.code}</p>
                          <h2 className="line-clamp-2 font-display text-xl font-semibold">{g.name}</h2>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <PackKindTag kind={g.kind} label={t.common.packKind[g.kind]} />
                          {!!fresh.get(g.setId) && (
                            <span data-testid="new-packs">
                              <Badge tone="new">{t.rewards.fx.newPacks(fresh.get(g.setId)!)}</Badge>
                            </span>
                          )}
                          <Badge tone="accent" className="tabular-nums">x{g.sealed}</Badge>
                        </div>
                      </div>
                      {g.locked ? (
                        <p className="text-sm text-ui-danger-text">{t.packs.mine.locked}</p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <Button size="lg" width="full" asChild>
                            <Link href={`/packs/${g.setId}${k}`}>{t.packs.mine.openOne}</Link>
                          </Button>
                          {g.sealed > 1 && (
                            <Button size="lg" width="full" variant="secondary" asChild>
                              <Link href={`/packs/${g.setId}/all${k}`}>{t.packs.mine.openAll(Math.min(g.sealed, 50))}</Link>
                            </Button>
                          )}
                        </div>
                      )}
                      {/* Spec 021, RF-9: cómo conseguir más sobres de una colección de Patreon (al final: las pruebas cuentan los enlaces de abrir). */}
                      {!g.isFree && !g.locked && !patron && <PatreonNotice compact text={t.packs.mine.patreonMore} linkLabel={t.collection.patreon.link} url={patreonUrl} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-ui-text-3">{t.common.aiNotice}</p>
        <MarkPacksSeen />
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
