import { db } from "@/db/client";
import { formatDate, formatDateTime } from "@/i18n/format";
import { getDict, getLocale } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { accountSummary } from "@/server/services/account";
import { DeclareAdultForm, DeleteAccountButton } from "@/features/account/AccountForms";

/** Spec 001: RF-21 (suscripción), RF-18 a RF-20 (edad) y RF-22 (borrar cuenta). */
export default async function CuentaPage() {
  const user = await requireUser("/cuenta");
  const s = (await accountSummary(db, user.id))!;
  const t = (await getDict()).account;
  const locale = await getLocale();
  const status = t.statusLabel[s.patronStatus ?? "none"] ?? t.statusLabel.none;
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      <section className="space-y-3 rounded-2xl border border-white/10 p-5" data-testid="account-subscription">
        <h2 className="text-lg font-semibold">{t.subscription}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-white/50">{t.tier}</dt>
          <dd data-testid="account-tiers">{s.tiers.length ? s.tiers.map((x) => x.name).join(", ") : t.noTier}</dd>
          <dt className="text-white/50">{t.status}</dt>
          <dd data-testid="account-status">{status}</dd>
          <dt className="text-white/50">{t.packsPerMonth}</dt>
          <dd data-testid="account-packs" className="tabular-nums">
            {s.packsPerMonth}
          </dd>
          <dt className="text-white/50">{t.lastCharge}</dt>
          <dd data-testid="account-last-charge">{s.lastChargeDate ? `${formatDate(locale, s.lastChargeDate)} · ${s.lastChargeStatus ?? ""}` : t.noCharge}</dd>
        </dl>
        {s.syncedAt && <p className="text-xs text-white/40">{t.syncedAt(formatDateTime(locale, s.syncedAt))}</p>}
        {s.patronStatus !== "active_patron" && <p className="text-sm text-white/60">{t.joinPatreon}</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 p-5" data-testid="account-adult">
        <h2 className="text-lg font-semibold">{t.adult.title}</h2>
        {s.adult.verified ? (
          <p className="text-sm text-emerald-300">{t.adult.verified}</p>
        ) : s.adult.hasAdultTier ? (
          <>
            <p className="text-sm text-white/70">{t.adult.canDeclare}</p>
            <DeclareAdultForm />
          </>
        ) : (
          <p className="text-sm text-white/60">{t.adult.needTier}</p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-red-400/20 p-5">
        <h2 className="text-lg font-semibold">{t.delete.title}</h2>
        <p className="text-sm text-white/60">{t.delete.body}</p>
        <DeleteAccountButton />
      </section>
    </main>
  );
}
