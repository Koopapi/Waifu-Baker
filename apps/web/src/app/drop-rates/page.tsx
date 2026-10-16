import { db } from "@/db/client";
import { RARITIES } from "@/domain/catalog/card-rules";
import { listPublicOdds } from "@/server/services/collections";
import { formatDate, formatPercent } from "@/i18n/format";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict, getLocale } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.site.dropRates.metaTitle, description: t.site.dropRates.metaDescription };
}
// Dinámica: así la compilación no necesita la BD y lo publicado se ve al momento.
export const dynamic = "force-dynamic";

/** RF-21: probabilidades públicas, congeladas al publicar cada colección. */
export default async function DropRatesPage() {
  const rows = await listPublicOdds(db);
  const [t, locale] = await Promise.all([getDict(), getLocale()]);
  const pct = (x: number) => formatPercent(locale, x);
  return (
    <main className="min-h-dvh bg-ui-bg px-4 py-12 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">{t.site.dropRates.heading}</h1>
          <p className="text-ui-text-2">{t.site.dropRates.intro}</p>
        </header>
        {rows.length === 0 && <p className="text-ui-text-3">{t.site.dropRates.empty}</p>}
        {rows.map(({ set, odds }) => (
          <section key={set.id} className="space-y-3">
            <h2 className="text-xl font-semibold">
              {set.name} <span className="font-mono text-sm text-ui-text-3">{set.code}</span>
            </h2>
            <p className="text-sm text-ui-text-3">
              {t.site.dropRates.published({
                date: odds.publishedAt ? formatDate(locale, odds.publishedAt) : "",
                version: odds.version,
                packSize: set.packSize,
                holo: pct(odds.holoChance * 100),
              })}
            </p>
            <p className="text-sm text-ui-text-2" data-testid={`pity-${set.code}`}>
              {odds.pityThreshold > 0
                ? t.site.dropRates.pity(odds.pityThreshold - 1)
                : t.site.dropRates.noPity}
            </p>
            <div className="overflow-x-auto rounded-xl border border-ui-line">
              <table className="w-full text-sm">
                <thead className="bg-ui-raised text-xs uppercase tracking-wider text-ui-text-3">
                  <tr>
                    <th className="px-3 py-2 text-left">{t.site.dropRates.slot}</th>
                    {RARITIES.map((r) => (
                      <th key={r} className="px-3 py-2 text-right">
                        {t.common.rarity[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {odds.slots.map((s, i) => (
                    <tr key={i} className="border-t border-ui-line">
                      <td className="px-3 py-2">{i + 1}</td>
                      {RARITIES.map((r) => (
                        <td key={r} className="px-3 py-2 text-right tabular-nums">
                          {s[r] ? pct(s[r]) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
