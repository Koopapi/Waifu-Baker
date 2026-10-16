import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { sets } from "@/db/schema";
import { getUserDetail } from "@/server/services/users-admin";
import { getDict, getLocale } from "@/i18n/server";
import { formatDate, formatDateTime } from "@/i18n/format";
import { now } from "@/server/clock";
import { rewardsForAdmin } from "@/server/services/rewards";
import { CookiesForm } from "./cookies-form";
import { GiftForm } from "./gift-form";

const pad = (n: number) => String(n).padStart(3, "0");

/** RF-27 (ficha) y RF-25/RF-26 (regalo de sobres). */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const detail = await getUserDetail(db, id);
  if (!detail) notFound();
  const { user, sealedPacks, collection, openings, patreon, packHistory } = detail;
  const verified = Boolean(user.isAdultDeclared && user.adultVerifiedAt);
  const published = await db.select().from(sets).where(eq(sets.status, "published"));
  const giftable = published.map((s) => ({ id: s.id, code: s.code, name: s.name, isAdult: s.isAdult, blocked: s.isAdult && !verified }));
  const tt = await getDict();
  const t = tt.admin.users;
  const rw = await rewardsForAdmin(db, user.id, now());
  const locale = await getLocale();
  const bySet = sealedPacks.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.setCode]: (acc[p.setCode] ?? 0) + 1 }), {});

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-2">
        <Link href="/admin/users" className="text-sm text-ui-text-3 hover:text-white">
          {t.back}
        </Link>
        <h1 className="text-2xl font-bold">{user.displayName || tt.admin.noName}</h1>
        <p className="text-sm text-ui-text-2">
          {t.patreon} <span className="font-mono">{user.patreonUserId}</span> · {user.role === "admin" ? t.admin : t.user} · {t.ageVerifiedLabel}{" "}
          {verified ? t.yesLower : t.noLower}
          {user.deletedAt && <span className="text-red-300">{t.accountDeleted}</span>}
        </p>
      </div>

      <section className="space-y-2 rounded-xl border border-ui-line p-4" data-testid="patreon-state">
        <h2 className="font-semibold">{t.patreonState.title}</h2>
        {!patreon ? (
          <p className="text-sm text-ui-text-3">{t.patreonState.none}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-ui-text-3">{t.patreonState.member}</dt>
            <dd className="font-mono">{patreon.memberId ?? "—"}</dd>
            <dt className="text-ui-text-3">{t.patreonState.status}</dt>
            <dd>{patreon.patronStatus ?? "—"}</dd>
            <dt className="text-ui-text-3">{t.patreonState.tiers}</dt>
            <dd className="font-mono">{patreon.entitledTierIds.join(", ") || "—"}</dd>
            <dt className="text-ui-text-3">{t.patreonState.lastCharge}</dt>
            <dd>{patreon.lastChargeDate ? `${formatDate(locale, patreon.lastChargeDate, "medium")} · ${patreon.lastChargeStatus ?? ""}` : "—"}</dd>
            <dt className="text-ui-text-3">{t.patreonState.nextCharge}</dt>
            <dd>{patreon.nextChargeDate ? formatDate(locale, patreon.nextChargeDate, "medium") : "—"}</dd>
            <dt className="text-ui-text-3">{t.patreonState.synced}</dt>
            <dd>{formatDateTime(locale, patreon.syncedAt)}</dd>
          </dl>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-ui-line p-4" data-testid="user-rewards">
        <h2 className="font-semibold">{t.rewards.title}</h2>
        <ul className="space-y-1 text-sm text-ui-text-2">
          <li>{t.rewards.charges(rw.free.charges, rw.free.max)}</li>
          <li>{t.rewards.streak(rw.daily.day, rw.daily.claimedToday)}</li>
          <li data-testid="user-cookies">{t.rewards.cookies(rw.cookies)}</li>
        </ul>
        {rw.history.length > 0 && (
          <ul className="divide-y divide-ui-line rounded-lg border border-ui-line text-sm">
            {rw.history.map((m) => (
              <li key={m.id} className="flex justify-between gap-4 px-3 py-1.5">
                <span>{tt.rewards.cookies.reason(m.reason)}</span>
                <span className={`tabular-nums ${m.amount < 0 ? "text-red-300" : "text-emerald-300"}`}>
                  {m.amount > 0 ? "+" : ""}
                  {m.amount} · {formatDateTime(locale, m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!user.deletedAt && <CookiesForm userId={user.id} />}
      </section>

      <section className="space-y-3 rounded-xl border border-ui-line bg-ui-raised p-4">
        <h2 className="font-semibold">{t.gift}</h2>
        {user.deletedAt ? <p className="text-sm text-ui-text-3">{t.cannotGiftDeleted}</p> : <GiftForm userId={user.id} sets={giftable} />}
      </section>

      <section className="space-y-2" data-testid="sealed-packs">
        <h2 className="font-semibold">{t.sealed(sealedPacks.length)}</h2>
        {sealedPacks.length === 0 ? (
          <p className="text-sm text-ui-text-3">{t.none}</p>
        ) : (
          <>
            <p className="text-sm text-ui-text-2">
              {Object.entries(bySet)
                .map(([code, n]) => `${code}: ${n}`)
                .join(" · ")}
            </p>
            <ul className="divide-y divide-ui-line rounded-xl border border-ui-line text-sm">
              {sealedPacks.slice(0, 20).map((p) => (
                <li key={p.id} className="flex justify-between gap-4 px-4 py-2">
                  <span>
                    <span className="font-mono">{p.setCode}</span> · {p.source === "manual" ? t.source.manual : p.source === "promo" ? t.source.promo : t.source.tier}
                    {p.reason && <span className="text-ui-text-3"> · {p.reason}</span>}
                  </span>
                  <span className="text-ui-text-3">{formatDateTime(locale, p.grantedAt)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-2" data-testid="pack-history">
        <h2 className="font-semibold">{t.packHistory.title}</h2>
        {packHistory.length === 0 ? (
          <p className="text-sm text-ui-text-3">{t.packHistory.empty}</p>
        ) : (
          <ul className="divide-y divide-ui-line rounded-xl border border-ui-line text-sm">
            {packHistory.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-4 py-2" data-status={p.status}>
                <span>
                  <span className="font-mono">{p.setCode}</span> · {p.source === "manual" ? t.source.manual : p.source === "promo" ? t.source.promo : t.source.tier}
                  {p.cycleKey && <span className="text-ui-text-3"> · {t.packHistory.cycle(p.cycleKey)}</span>}
                  {p.reason && <span className="text-ui-text-3"> · {p.reason}</span>}
                </span>
                <span className={p.status === "void" ? "text-red-300" : "text-ui-text-3"}>
                  {t.packHistory.status[p.status] ?? p.status} · {formatDateTime(locale, p.grantedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t.collection(collection.length, collection.reduce((a, c) => a + c.qty, 0))}</h2>
        {collection.length === 0 ? (
          <p className="text-sm text-ui-text-3">{t.noOpenings}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {collection.map((c) => (
              <li key={`${c.cardId}-${c.holo}`} className="rounded-lg border border-ui-line px-3 py-2">
                <span className="font-mono text-ui-text-3">
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
          <p className="text-sm text-ui-text-3">{t.noHistory}</p>
        ) : (
          <ul className="divide-y divide-ui-line rounded-xl border border-ui-line text-sm">
            {openings.map((o) => (
              <li key={o.id} className="flex justify-between px-4 py-2">
                <span>
                  {o.setCode} · {t.cardCount(o.cardIds.length)}
                </span>
                <span className="text-ui-text-3">{formatDateTime(locale, o.openedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
