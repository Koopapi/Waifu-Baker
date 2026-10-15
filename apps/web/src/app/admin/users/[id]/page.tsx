import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { sets } from "@/db/schema";
import { getUserDetail } from "@/server/services/users-admin";
import { getDict, getLocale } from "@/i18n/server";
import { formatDateTime } from "@/i18n/format";
import { GiftForm } from "./gift-form";

const pad = (n: number) => String(n).padStart(3, "0");

/** RF-27 (ficha) y RF-25/RF-26 (regalo de sobres). */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const detail = await getUserDetail(db, id);
  if (!detail) notFound();
  const { user, sealedPacks, collection, openings } = detail;
  const verified = Boolean(user.isAdultDeclared && user.adultVerifiedAt);
  const published = await db.select().from(sets).where(eq(sets.status, "published"));
  const giftable = published.map((s) => ({ id: s.id, code: s.code, name: s.name, isAdult: s.isAdult, blocked: s.isAdult && !verified }));
  const tt = await getDict();
  const t = tt.admin.users;
  const locale = await getLocale();
  const bySet = sealedPacks.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.setCode]: (acc[p.setCode] ?? 0) + 1 }), {});

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-2">
        <Link href="/admin/users" className="text-sm text-white/50 hover:text-white">
          {t.back}
        </Link>
        <h1 className="text-2xl font-bold">{user.displayName || tt.admin.noName}</h1>
        <p className="text-sm text-white/60">
          {t.patreon} <span className="font-mono">{user.patreonUserId}</span> · {user.role === "admin" ? t.admin : t.user} · {t.ageVerifiedLabel}{" "}
          {verified ? t.yesLower : t.noLower}
          {user.deletedAt && <span className="text-red-300">{t.accountDeleted}</span>}
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="font-semibold">{t.gift}</h2>
        {user.deletedAt ? <p className="text-sm text-white/50">{t.cannotGiftDeleted}</p> : <GiftForm userId={user.id} sets={giftable} />}
      </section>

      <section className="space-y-2" data-testid="sealed-packs">
        <h2 className="font-semibold">{t.sealed(sealedPacks.length)}</h2>
        {sealedPacks.length === 0 ? (
          <p className="text-sm text-white/50">{t.none}</p>
        ) : (
          <>
            <p className="text-sm text-white/60">
              {Object.entries(bySet)
                .map(([code, n]) => `${code}: ${n}`)
                .join(" · ")}
            </p>
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10 text-sm">
              {sealedPacks.slice(0, 20).map((p) => (
                <li key={p.id} className="flex justify-between gap-4 px-4 py-2">
                  <span>
                    <span className="font-mono">{p.setCode}</span> · {p.source === "manual" ? t.source.manual : p.source === "promo" ? t.source.promo : t.source.tier}
                    {p.reason && <span className="text-white/50"> · {p.reason}</span>}
                  </span>
                  <span className="text-white/40">{formatDateTime(locale, p.grantedAt)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t.collection(collection.length, collection.reduce((a, c) => a + c.qty, 0))}</h2>
        {collection.length === 0 ? (
          <p className="text-sm text-white/50">{t.noOpenings}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {collection.map((c) => (
              <li key={`${c.cardId}-${c.holo}`} className="rounded-lg border border-white/10 px-3 py-2">
                <span className="font-mono text-white/50">
                  {c.setCode} · {pad(c.number)}
                </span>{" "}
                {c.name} · {c.rarity ? tt.common.rarity[c.rarity] : "—"}
                {c.holo ? " holo" : ""} · x{c.qty}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t.history}</h2>
        {openings.length === 0 ? (
          <p className="text-sm text-white/50">{t.noHistory}</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10 text-sm">
            {openings.map((o) => (
              <li key={o.id} className="flex justify-between px-4 py-2">
                <span>
                  {o.setCode} · {t.cardCount(o.cardIds.length)}
                </span>
                <span className="text-white/40">{formatDateTime(locale, o.openedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
