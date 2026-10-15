import Link from "next/link";
import { db } from "@/db/client";
import { requireUser } from "@/server/auth/require-user";
import { getMyAlbum } from "@/server/services/album";
import { myCollections } from "@/server/services/collection";

/** RF-1 y RF-4: colecciones del usuario con su progreso. */
export default async function MiColeccionPage() {
  const user = await requireUser("/coleccion");
  const [cols, album] = await Promise.all([myCollections(db, user.id), getMyAlbum(db, user.id)]);
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Mi colección</h1>
        <Link href="/coleccion/album" className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/5" data-testid="album-settings-link">
          {album?.isPublic ? "Álbum público: activo" : "Álbum público"}
        </Link>
      </div>
      {cols.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/60">
          Aún no tienes cartas. Abre tus sobres en{" "}
          <Link href="/sobres" className="underline">
            Mis sobres
          </Link>{" "}
          para empezar tu colección.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cols.map((c) => {
            const pct = c.progress.total ? Math.round((c.progress.owned / c.progress.total) * 100) : 0;
            return (
              <li key={c.setId} data-testid={`collection-${c.code}`}>
                {c.locked ? (
                  <div className="space-y-2 rounded-2xl border border-white/10 p-5">
                    <p className="font-mono text-xs text-white/50">{c.code}</p>
                    <h2 className="text-lg font-semibold">{c.name}</h2>
                    <p className="text-sm text-rose-200">Colección 18+: verifica tu edad con un tier adulto de Patreon para ver estas cartas.</p>
                  </div>
                ) : (
                  <Link href={`/coleccion/${c.setId}`} className="block space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-white/50">{c.code}</p>
                        <h2 className="text-lg font-semibold">{c.name}</h2>
                      </div>
                      <span className="text-sm tabular-nums text-white/70" data-testid="progress">
                        {c.progress.owned}/{c.progress.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-gradient-to-r from-[#d6b370] to-[#ff6ad5]" style={{ width: `${pct}%` }} />
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
