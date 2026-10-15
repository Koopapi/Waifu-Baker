import Link from "next/link";
import { db } from "@/db/client";
import { requireUser } from "@/server/auth/require-user";
import { listMyPacks, pendingOpening } from "@/server/services/packs";

/** RF-1, RF-3 y RF-17: sobres sin abrir por colección y aviso de apertura sin terminar. */
export default async function MisSobresPage() {
  const user = await requireUser("/sobres");
  const [groups, pending] = await Promise.all([listMyPacks(db, user.id), pendingOpening(db, user.id)]);
  const total = groups.reduce((a, g) => a + g.sealed, 0);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Mis sobres</h1>
        <p className="text-white/60">{total === 0 ? "No tienes sobres sin abrir." : `Tienes ${total} sobre(s) sin abrir.`}</p>
      </div>

      {pending && (
        <Link
          href={`/sobres/${pending.setId}?pack=${pending.packId}`}
          className="block rounded-2xl border border-[#d6b370]/50 bg-[#d6b370]/10 p-4 text-sm hover:bg-[#d6b370]/15"
          data-testid="pending-opening"
        >
          Tienes una apertura sin terminar de ver. <span className="underline">Volver a verla</span>
        </Link>
      )}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/60">
          Cuando recibas sobres por tu suscripción o como regalo aparecerán aquí.{" "}
          <Link href="/drop-rates" className="underline">
            Mira qué puede salir
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
                  Colección 18+. Para abrir estos sobres necesitas verificar tu edad con un tier adulto de Patreon. Tus sobres se conservan mientras tanto.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/sobres/${g.setId}`} className="rounded-full bg-[#d6b370] px-5 py-2 text-sm font-semibold text-[#0b0c0e]">
                    Abrir un sobre
                  </Link>
                  {g.sealed > 1 && (
                    <Link href={`/sobres/${g.setId}/todos`} className="rounded-full border border-white/20 px-5 py-2 text-sm">
                      Abrir todos ({Math.min(g.sealed, 50)})
                    </Link>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-white/40">Las ilustraciones de las cartas están generadas con IA. Las cartas no tienen valor monetario ni se pueden intercambiar.</p>
    </main>
  );
}
