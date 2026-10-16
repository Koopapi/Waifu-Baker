import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, characters, packs, sets, users } from "@/db/schema";
import { listSets } from "@/server/services/collections";
import { AdultBadge, StatusBadge } from "@/features/admin/ui";
import { getDict } from "@/i18n/server";

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
  const t = (await getDict()).admin.dashboard;
  const totalCards = rows.reduce((a, r) => a + r.cardCount, 0);
  const stats = [
    { label: t.publishedSets, value: t.publishedOf(pub.n, rows.length) },
    { label: t.cards, value: totalCards },
    { label: t.characters, value: ch.n },
    { label: t.users, value: us.n },
    { label: t.sealedPacks, value: sealed.n },
  ];
  const drafts = rows.filter((r) => r.status === "draft");

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((x) => (
          <div key={x.label} className="rounded-xl border border-ui-line bg-ui-raised p-4">
            <div className="text-2xl font-bold tabular-nums">{x.value}</div>
            <div className="text-sm text-ui-text-2">{x.label}</div>
          </div>
        ))}
      </div>

      {unreviewed.n > 0 && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-rose-200">
          {t.unreviewed(unreviewed.n)}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t.drafts}</h2>
          <Link href="/admin/sets" className="text-sm text-ui-text-2 underline underline-offset-4 hover:text-white">
            {t.allSets}
          </Link>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-ui-text-3">{t.noDrafts}</p>
        ) : (
          <ul className="divide-y divide-ui-line rounded-xl border border-ui-line">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/sets/${d.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ui-raised">
                  <span className="font-mono">{d.code}</span>
                  <span className="flex-1">{d.name}</span>
                  <AdultBadge adult={d.isAdult} />
                  <StatusBadge status={d.status} />
                  <span className="w-20 text-right text-sm tabular-nums text-ui-text-2">{t.cardCount(d.cardCount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
