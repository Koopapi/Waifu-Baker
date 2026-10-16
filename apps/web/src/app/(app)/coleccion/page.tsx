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

/** RF-1 y RF-4: colecciones del usuario con su progreso. */
export default async function MiColeccionPage() {
  const user = await requireUser("/coleccion");
  const [cols, album, t] = await Promise.all([myCollections(db, user.id), getMyAlbum(db, user.id), getDict()]);
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.collection.title}</h1>
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
            <li key={c.setId} data-testid={`collection-${c.code}`} className="card-in" style={{ "--i": i } as React.CSSProperties}>
              {c.locked ? (
                <Card as="div" className="space-y-2">
                  <p className="font-mono text-xs text-ui-text-3">{c.code}</p>
                  <h2 className="text-lg font-semibold">{c.name}</h2>
                  <p className="text-sm text-ui-danger-text">{t.collection.adultLocked}</p>
                </Card>
              ) : (
                <Link href={`/coleccion/${c.setId}`} className={`block rounded-l ${focusRing}`}>
                  <Card as="div" interactive className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-ui-text-3">{c.code}</p>
                        <h2 className="text-lg font-semibold">{c.name}</h2>
                      </div>
                      <span className="text-sm tabular-nums text-ui-text-2" data-testid="progress">
                        {c.progress.owned}/{c.progress.total}
                      </span>
                    </div>
                    <Progress label={c.name} value={c.progress.owned} max={c.progress.total} />
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
