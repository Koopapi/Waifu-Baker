import Link from "next/link";
import { db } from "@/db/client";
import { getDict } from "@/i18n/server";
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
        <Link href="/coleccion/album" className="btn rounded-md border border-ui-line px-4 py-2 text-sm hover:bg-ui-hover" data-testid="album-settings-link">
          {album?.isPublic ? t.collection.publicAlbumLinkActive : t.collection.publicAlbumLink}
        </Link>
      </div>
      {cols.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ui-line p-10 text-center text-ui-text-2">
          {t.collection.emptyBefore}{" "}
          <Link href="/sobres" className="underline">
            {t.common.nav.myPacks}
          </Link>{" "}
          {t.collection.emptyAfter}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cols.map((c) => {
            const pct = c.progress.total ? Math.round((c.progress.owned / c.progress.total) * 100) : 0;
            return (
              <li key={c.setId} data-testid={`collection-${c.code}`}>
                {c.locked ? (
                  <div className="space-y-2 rounded-2xl border border-ui-line p-5">
                    <p className="font-mono text-xs text-ui-text-3">{c.code}</p>
                    <h2 className="text-lg font-semibold">{c.name}</h2>
                    <p className="text-sm text-rose-200">{t.collection.adultLocked}</p>
                  </div>
                ) : (
                  <Link href={`/coleccion/${c.setId}`} className="block space-y-3 rounded-2xl border border-ui-line bg-ui-raised p-5 hover:bg-ui-hover">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-ui-text-3">{c.code}</p>
                        <h2 className="text-lg font-semibold">{c.name}</h2>
                      </div>
                      <span className="text-sm tabular-nums text-ui-text-2" data-testid="progress">
                        {c.progress.owned}/{c.progress.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ui-hover" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-gradient-to-r from-ui-accent to-ui-accent-text" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
