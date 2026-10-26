import Link from "next/link";
import { db } from "@/db/client";
import { getDict } from "@/i18n/server";
import { Button } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { Progress } from "@/ui/content/Progress";
import { EmptyState } from "@/ui/feedback/EmptyState";
import { focusRing } from "@/ui/focus";
import { requireUser } from "@/server/auth/require-user";
import { getMyAlbum } from "@/server/services/album";
import { myCollections } from "@/server/services/collection";
import { packArtForSets } from "@/server/services/pack-art";
import { cardImageUrl } from "@/server/cards/image-urls";
import { isPatronUser, patreonPageUrl } from "@/server/services/patron";
import { PatreonNotice } from "@/features/economy/PatreonNotice";

/** RF-1 y RF-4: colecciones del usuario con su progreso. */
export default async function MiColeccionPage() {
  const user = await requireUser("/coleccion");
  const [cols, album, t, patron] = await Promise.all([myCollections(db, user.id), getMyAlbum(db, user.id), getDict(), isPatronUser(db, user.id)]);
  const patreonUrl = patreonPageUrl();
  const art = await packArtForSets(db, cols.map((c) => c.setId));
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">{t.collection.title}</h1>
        <Button variant="secondary" asChild>
          <Link href="/coleccion/album" data-testid="album-settings-link">
            {album?.isPublic ? t.collection.publicAlbumLinkActive : t.collection.publicAlbumLink}
          </Link>
        </Button>
      </div>
      {cols.length === 0 ? (
        <EmptyState
          title={`${t.collection.emptyBefore} ${t.common.nav.myPacks} ${t.collection.emptyAfter}`}
          action={
            <Button asChild>
              <Link href="/sobres">{t.common.nav.myPacks}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cols.map((c, i) => (
            <li key={c.setId} data-testid={`collection-${c.code}`} className="card-in space-y-2" style={{ "--i": i } as React.CSSProperties}>
              {/* Spec 021, RF-9: cómo se consigue una colección de Patreon (fuera del enlace: un enlace no va dentro de otro). */}
              {!c.locked && !c.isFree && !patron && <PatreonNotice compact text={t.collection.patreon.notice} linkLabel={t.collection.patreon.link} url={patreonUrl} />}
              {c.locked ? (
                <Card as="div" className="space-y-2">
                  <p className="font-mono text-xs text-ui-text-3">{c.code}</p>
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  <p className="text-sm text-ui-danger-text">{t.collection.adultLocked}</p>
                </Card>
              ) : (
                <Link href={`/coleccion/${c.setId}`} className={`block rounded-xl ${focusRing}`}>
                  {/* Spec 014, RF-18: portada, progreso, datos y vista previa de las mejores cartas. */}
                  <Card as="div" interactive className="overflow-hidden">
                    <div className="relative h-40 overflow-hidden rounded-l bg-linear-to-br from-k-lavanda to-k-chicle">
                      {art.get(c.setId)?.coverVersion && (
                        // eslint-disable-next-line @next/next/no-img-element -- imagen privada servida por la API
                        <img src={`/api/sets/${c.setId}/art?k=cover&v=${art.get(c.setId)!.coverVersion}`} alt="" className="absolute inset-0 size-full scale-[1.32] object-cover object-[center_30%]" />
                      )}
                      <div className="absolute inset-0 bg-linear-to-b from-transparent via-ui-nav/30 to-ui-raised" />
                      <div className="absolute inset-x-4 bottom-3 space-y-1">
                        <span className="inline-block rounded-full bg-k-chicle px-2.5 py-0.5 text-xs font-black text-ui-on-accent">{c.code}</span>
                        <h2 className="truncate font-display text-2xl font-semibold">{c.name}</h2>
                      </div>
                    </div>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm font-black">
                          <span className="tabular-nums" data-testid="progress">
                            {c.progress.owned}/{c.progress.total}
                          </span>
                          <span className="tabular-nums text-ui-accent-text">{Math.round((c.progress.owned / Math.max(1, c.progress.total)) * 100)} %</span>
                        </div>
                        <Progress label={c.name} value={c.progress.owned} max={c.progress.total} />
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-center">
                        {[
                          [String(c.stats.holo), t.collection.stats.holo, "text-k-celeste border-k-celeste/40 bg-k-celeste/10"],
                          [c.stats.best ? t.common.rarity[c.stats.best] : "—", t.collection.stats.best, "text-k-limon border-k-limon/40 bg-k-limon/10"],
                          [String(c.stats.copies), t.collection.stats.copies, "text-k-menta border-k-menta/40 bg-k-menta/10"],
                        ].map(([v, l, cls]) => (
                          <div key={l} className={`min-w-0 rounded-l border px-1 py-2 ${cls}`}>
                            <dd className="truncate font-display text-base font-semibold">{v}</dd>
                            <dt className="truncate text-[11px] font-extrabold text-ui-text-3">{l}</dt>
                          </div>
                        ))}
                      </dl>
                      {c.preview.length > 0 && (
                        <ul className="grid grid-cols-4 gap-2" aria-hidden>
                          {c.preview.map((id) => (
                            <li key={id} className="overflow-hidden rounded-m border-2 border-k-lavanda/40">
                              {/* eslint-disable-next-line @next/next/no-img-element -- imagen firmada de la carta */}
                              <img src={cardImageUrl(id, "thumb", user.id)} alt="" className="aspect-[700/991] w-full object-cover" />
                            </li>
                          ))}
                        </ul>
                      )}
                      <span className="block rounded-full bg-linear-to-r from-k-chicle to-ui-accent-hover py-2.5 text-center font-extrabold text-ui-on-accent shadow-[var(--shadow-relief)]">
                        {t.collection.viewCollection}
                      </span>
                    </div>
                  </Card>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
