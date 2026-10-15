import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, characters, packs, sets, users } from "@/db/schema";
import { listSets } from "@/server/services/collections";
import { AdultBadge, StatusBadge } from "@/features/admin/ui";

export default async function AdminHome() {
  const [[pub], [ch], [us], [sealed], [unreviewed], rows] = await Promise.all([
    db.select({ n: count() }).from(sets).where(eq(sets.status, "published")),
    db.select({ n: count() }).from(characters),
    db.select({ n: count() }).from(users).where(isNull(users.deletedAt)),
    db.select({ n: count() }).from(packs).where(eq(packs.status, "sealed")),
    db
      .select({ n: count() })
      .from(cards)
      .innerJoin(sets, eq(sets.id, cards.setId))
      .where(and(eq(sets.isAdult, true), isNull(cards.adultReviewedAt))),
    listSets(db),
  ]);
  const totalCards = rows.reduce((a, r) => a + r.cardCount, 0);
  const stats = [
    { label: "Colecciones publicadas", value: `${pub.n} de ${rows.length}` },
    { label: "Cartas", value: totalCards },
    { label: "Personajes", value: ch.n },
    { label: "Usuarios", value: us.n },
    { label: "Sobres sin abrir", value: sealed.n },
  ];
  const drafts = rows.filter((r) => r.status === "draft");

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold">Resumen</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((x) => (
          <div key={x.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-2xl font-bold tabular-nums">{x.value}</div>
            <div className="text-sm text-white/60">{x.label}</div>
          </div>
        ))}
      </div>

      {unreviewed.n > 0 && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-rose-200">
          {unreviewed.n} carta(s) de colecciones 18+ pendientes de la revisión «personaje claramente adulto».
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Borradores en preparación</h2>
          <Link href="/admin/sets" className="text-sm text-white/60 underline underline-offset-4 hover:text-white">
            Todas las colecciones
          </Link>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-white/50">No hay borradores. Crea una colección para empezar a cargar cartas.</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/sets/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                  <span className="font-mono">{d.code}</span>
                  <span className="flex-1">{d.name}</span>
                  <AdultBadge adult={d.isAdult} />
                  <StatusBadge status={d.status} />
                  <span className="w-20 text-right text-sm tabular-nums text-white/60">{d.cardCount} cartas</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
