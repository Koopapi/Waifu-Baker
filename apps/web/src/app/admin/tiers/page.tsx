import { ReconcileButton } from "@/features/admin/tiers/ReconcileButton";
import { db } from "@/db/client";
import { getPatreonClient } from "@/server/patreon/client-instance";
import { tierOverview } from "@/server/services/tiers";
import { getDict, getLocale } from "@/i18n/server";
import { formatMoney } from "@/i18n/format";
import { Alert } from "@/ui/feedback/Alert";
import { AddRuleForm, RuleRow } from "./forms";

/** RF-24: qué colección y cuántos sobres al mes da cada tier de Patreon. */
export default async function TiersPage() {
  const { client, mode } = getPatreonClient();
  const t = (await getDict()).admin.tiers;
  const locale = await getLocale();
  if (!client) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ui-text-2">{t.notConfigured}</p>
      </div>
    );
  }
  let overview;
  try {
    overview = await tierOverview(db, client);
  } catch (e) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Alert tone="danger">{t.loadFailed((e as Error).message)}</Alert>
      </div>
    );
  }
  const sets = overview.grantableSets.map((s) => ({ id: s.id, code: s.code, name: s.name, isAdult: s.isAdult }));
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ui-text-2">{t.intro}</p>
        <ReconcileButton />
        {mode === "fake" && <Alert tone="warning">{t.fakeMode}</Alert>}
      </div>
      {overview.tiers.map((tier) => (
        <section key={tier.id} className="overflow-hidden rounded-l bg-ui-nav" data-testid={`tier-${tier.id}`}>
          <header className="flex items-center justify-between bg-ui-raised px-4 py-3">
            <span className="font-semibold">{tier.title}</span>
            <span className="text-sm text-ui-text-3">
              {formatMoney(locale, tier.amountCents)} {t.perMonth}
              {!tier.published && t.notPublished}
            </span>
          </header>
          {tier.rules.map((r) => (
            <RuleRow key={r.id} tierId={tier.id} tierName={tier.title} rule={r} />
          ))}
          <AddRuleForm tierId={tier.id} tierName={tier.title} sets={sets.filter((s) => !tier.rules.some((r) => r.setId === s.id))} anyPublished={sets.length > 0} />
        </section>
      ))}
      {overview.orphanRules.length > 0 && (
        <section className="rounded-l border border-ui-warning/60 p-4 text-sm">
          <h2 className="mb-2 font-semibold text-ui-warning-text">{t.orphans}</h2>
          {overview.orphanRules.map((r) => (
            <RuleRow key={r.id} tierId={r.patreonTierId} tierName={r.name} rule={r} />
          ))}
        </section>
      )}
    </div>
  );
}
