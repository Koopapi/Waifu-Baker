import { db } from "@/db/client";
import { getPatreonClient } from "@/server/patreon/client-instance";
import { tierOverview } from "@/server/services/tiers";
import { AddRuleForm, RuleRow } from "./forms";

const money = (cents: number) => (cents / 100).toLocaleString("es", { style: "currency", currency: "USD" });

/** RF-24: qué colección y cuántos sobres al mes da cada tier de Patreon. */
export default async function TiersPage() {
  const { client, mode } = getPatreonClient();
  if (!client) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tiers de Patreon</h1>
        <p className="text-sm text-white/60">Configura PATREON_CREATOR_ACCESS_TOKEN y PATREON_CAMPAIGN_ID para leer los tiers de la campaña.</p>
      </div>
    );
  }
  let overview;
  try {
    overview = await tierOverview(db, client);
  } catch (e) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tiers de Patreon</h1>
        <p role="alert" className="text-sm text-red-300">No se pudieron leer los tiers: {(e as Error).message}</p>
      </div>
    );
  }
  const sets = overview.grantableSets.map((s) => ({ id: s.id, code: s.code, name: s.name, isAdult: s.isAdult }));
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Tiers de Patreon</h1>
        <p className="text-sm text-white/60">
          Cada tier puede dar sobres de varias colecciones publicadas. Los cambios se aplican desde el siguiente cobro de cada miembro. Un tier que da una
          colección 18+ es también el que verifica la edad.
        </p>
        {mode === "fake" && (
          <p className="text-xs text-amber-300">Modo desarrollo: tiers de ejemplo. Con PATREON_CREATOR_ACCESS_TOKEN y PATREON_CAMPAIGN_ID se leen los reales.</p>
        )}
      </div>
      {overview.tiers.map((t) => (
        <section key={t.id} className="overflow-hidden rounded-xl border border-white/10" data-testid={`tier-${t.id}`}>
          <header className="flex items-center justify-between bg-white/[0.03] px-4 py-3">
            <span className="font-semibold">{t.title}</span>
            <span className="text-sm text-white/50">
              {money(t.amountCents)} / mes{!t.published && " · no publicado"}
            </span>
          </header>
          {t.rules.map((r) => (
            <RuleRow key={r.id} tierId={t.id} tierName={t.title} rule={r} />
          ))}
          <AddRuleForm tierId={t.id} tierName={t.title} sets={sets.filter((s) => !t.rules.some((r) => r.setId === s.id))} anyPublished={sets.length > 0} />
        </section>
      ))}
      {overview.orphanRules.length > 0 && (
        <section className="rounded-xl border border-amber-400/30 p-4 text-sm">
          <h2 className="mb-2 font-semibold text-amber-200">Reglas de tiers que ya no existen en la campaña</h2>
          {overview.orphanRules.map((r) => (
            <RuleRow key={r.id} tierId={r.patreonTierId} tierName={r.name} rule={r} />
          ))}
        </section>
      )}
    </div>
  );
}
