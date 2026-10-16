import { db } from "@/db/client";
import { formatDate, formatDateTime } from "@/i18n/format";
import { getDict, getLocale } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { accountSummary } from "@/server/services/account";
import { now } from "@/server/clock";
import { cookieHistory, rewardsSummary } from "@/server/services/rewards";
import { DeclareAdultForm, DeleteAccountButton } from "@/features/account/AccountForms";

/** Spec 001: RF-21 (suscripción), RF-18 a RF-20 (edad) y RF-22 (borrar cuenta). */
export default async function CuentaPage() {
  const user = await requireUser("/cuenta");
  const s = (await accountSummary(db, user.id))!;
  const all = await getDict();
  const t = all.account;
  const tc = all.rewards.cookies;
  const [rw, history] = await Promise.all([rewardsSummary(db, user.id, { now: now() }), cookieHistory(db, user.id, 30)]);
  const locale = await getLocale();
  const status = t.statusLabel[s.patronStatus ?? "none"] ?? t.statusLabel.none;
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-6 md:px-8">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      <section className="space-y-3 rounded-2xl border border-ui-line p-5" data-testid="account-subscription">
        <h2 className="text-lg font-semibold">{t.subscription}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-ui-text-3">{t.tier}</dt>
          <dd data-testid="account-tiers">{s.tiers.length ? s.tiers.map((x) => x.name).join(", ") : t.noTier}</dd>
          <dt className="text-ui-text-3">{t.status}</dt>
          <dd data-testid="account-status">{status}</dd>
          <dt className="text-ui-text-3">{t.packsPerMonth}</dt>
          <dd data-testid="account-packs" className="tabular-nums">
            {s.packsPerMonth}
          </dd>
          <dt className="text-ui-text-3">{t.lastCharge}</dt>
          <dd data-testid="account-last-charge">{s.lastChargeDate ? `${formatDate(locale, s.lastChargeDate)} · ${s.lastChargeStatus ?? ""}` : t.noCharge}</dd>
        </dl>
        {s.syncedAt && <p className="text-xs text-ui-text-3">{t.syncedAt(formatDateTime(locale, s.syncedAt))}</p>}
        {s.patronStatus !== "active_patron" && <p className="text-sm text-ui-text-2">{t.joinPatreon}</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-ui-line p-5" data-testid="account-adult">
        <h2 className="text-lg font-semibold">{t.adult.title}</h2>
        {s.adult.verified ? (
          <p className="text-sm text-emerald-300">{t.adult.verified}</p>
        ) : s.adult.hasAdultTier ? (
          <>
            <p className="text-sm text-ui-text-2">{t.adult.canDeclare}</p>
            <DeclareAdultForm />
          </>
        ) : (
          <p className="text-sm text-ui-text-2">{t.adult.needTier}</p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-ui-line p-5" data-testid="account-cookies">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{tc.title}</h2>
          <span className="tabular-nums text-ui-text-2">{tc.balance(rw.cookies)}</span>
        </div>
        <p className="text-sm text-ui-text-2">{tc.about}</p>
        <h3 className="text-sm font-semibold text-ui-text-2">{tc.history}</h3>
        {history.length === 0 ? (
          <p className="text-sm text-ui-text-3">{tc.empty}</p>
        ) : (
          <ul className="divide-y divide-ui-line rounded-lg border border-ui-line text-sm">
            {history.map((m) => (
              <li key={m.id} className="flex justify-between gap-4 px-3 py-1.5">
                <span>{tc.reason(m.reason)}</span>
                <span className={`tabular-nums ${m.amount < 0 ? "text-red-300" : "text-emerald-300"}`}>
                  {m.amount > 0 ? "+" : ""}
                  {m.amount} · {formatDateTime(locale, m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-red-400/20 p-5">
        <h2 className="text-lg font-semibold">{t.delete.title}</h2>
        <p className="text-sm text-ui-text-2">{t.delete.body}</p>
        <DeleteAccountButton />
      </section>
    </main>
  );
}
