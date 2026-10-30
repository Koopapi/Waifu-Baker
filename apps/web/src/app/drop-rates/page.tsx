import { db } from "@/db/client";
import { RARITIES } from "@/domain/catalog/card-rules";
import { listPublicOdds } from "@/server/services/collections";
import { publicZoneOdds } from "@/server/services/expedition-zones";
import { gamesDictionaries } from "@/i18n/games";
import { Badge } from "@/ui/content/Badge";
import { PackKindTag } from "@/features/packs/PackKindTag";
import { formatDate, formatPercent } from "@/i18n/format";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { CloseButton } from "@/features/shell/CloseButton";
import { getDict, getLocale } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.site.dropRates.metaTitle, description: t.site.dropRates.metaDescription };
}
// Dinámica: así la compilación no necesita la BD y lo publicado se ve al momento.
export const dynamic = "force-dynamic";

/** RF-21: probabilidades públicas, congeladas al publicar cada colección (spec 022: las del sobre plata y las del gold). */
export default async function DropRatesPage() {
  const [rows, zones] = await Promise.all([listPublicOdds(db), publicZoneOdds(db)]);
  const [t, locale] = await Promise.all([getDict(), getLocale()]);
  const tg = gamesDictionaries[locale];
  const pct = (x: number) => formatPercent(locale, x);
  return (
    <main className="min-h-dvh bg-ui-bg px-4 py-12 text-ui-text">
      {/* Página suelta, sin la barra del coleccionista: la X la cierra sin depender del botón «atrás» del navegador. */}
      <CloseButton className="fixed left-4 top-4 z-50" />
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">{t.site.dropRates.heading}</h1>
          <p className="text-ui-text-2">{t.site.dropRates.intro}</p>
        </header>
        {rows.length === 0 && <p className="text-ui-text-3">{t.site.dropRates.empty}</p>}
        {rows.map(({ set, odds, gold }) => (
          <section key={set.id} className="space-y-3">
            <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
              {set.name} <span className="font-mono text-sm text-ui-text-3">{set.code}</span>
              {/* Spec 021, RF-10: gratis o con la suscripción. */}
              <span data-testid={`how-${set.code}`}>
                <Badge tone={set.isFree ? "success" : "accent"}>{set.isFree ? t.site.dropRates.how.free : t.site.dropRates.how.patreon}</Badge>
              </span>
            </h2>
            {/* Spec 022, RF-20: las dos tablas de la colección en una, con la columna «Sobre» (maqueta aprobada). */}
            <ul className="space-y-1 text-sm">
              {([["silver", odds], ["gold", gold]] as const).map(([kind, table]) =>
                table ? (
                  <li key={kind} className="flex flex-wrap items-center gap-2 text-ui-text-3" data-testid={`published-${set.code}-${kind}`}>
                    <PackKindTag kind={kind} label={t.common.packKind[kind]} />
                    <span>
                      {t.site.dropRates.guarantee[kind]}{" "}
                      {t.site.dropRates.published({
                        date: table.publishedAt ? formatDate(locale, table.publishedAt) : "",
                        version: table.version,
                        packSize: set.packSize,
                        holo: pct(table.holoChance * 100),
                      })}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
            <p className="text-sm text-ui-text-2" data-testid={`pity-${set.code}`}>
              {odds.pityThreshold > 0 ? t.site.dropRates.pity(odds.pityThreshold - 1) : t.site.dropRates.noPity}
            </p>
            <div className="overflow-x-auto rounded-l border border-ui-line">
              <table className="w-full text-sm">
                <thead className="bg-ui-raised text-xs uppercase tracking-wider text-ui-text-3">
                  <tr>
                    <th className="px-3 py-2 text-left">{t.site.dropRates.pack}</th>
                    <th className="px-3 py-2 text-left">{t.site.dropRates.slot}</th>
                    {RARITIES.map((r) => (
                      <th key={r} className="px-3 py-2 text-right">
                        {t.common.rarity[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                {([["silver", odds], ["gold", gold]] as const).map(([kind, table]) =>
                  table ? (
                    <tbody key={kind} data-testid={`odds-${set.code}-${kind}`} className={kind === "gold" ? "bg-k-limon/7" : "bg-ui-nav"}>
                      {table.slots.map((s, i) => (
                        <tr key={i} className="border-t border-ui-line">
                          <td className={`px-3 py-2 font-semibold ${kind === "gold" ? "text-k-limon-oscuro" : "text-ui-text-2"}`}>{t.common.packKind[kind]}</td>
                          <td className="px-3 py-2">
                            {i + 1}
                            {i === table.slots.length - 1 && <span className="ml-1 text-ui-text-3">{t.site.dropRates.guaranteedSlot}</span>}
                          </td>
                          {RARITIES.map((r) => (
                            <td key={r} className="px-3 py-2 text-right tabular-nums">
                              {s[r] ? pct(s[r]) : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  ) : null,
                )}
              </table>
            </div>
          </section>
        ))}
        {/* Spec 020, RF-26: probabilidad de encontrar un sobre al volver de una expedición, por zona y duración. */}
        {zones.length > 0 && (
          <section className="space-y-3" data-testid="expedition-odds">
            <h2 className="text-xl font-semibold">{tg.odds.heading}</h2>
            <p className="text-sm text-ui-text-2">{tg.odds.intro}</p>
            <div className="overflow-x-auto rounded-l border border-ui-line">
              <table className="w-full text-sm">
                <thead className="bg-ui-raised text-xs uppercase tracking-wider text-ui-text-3">
                  <tr>
                    <th className="px-3 py-2 text-left">{tg.odds.zone}</th>
                    {zones[0].chances.map((c) => (
                      <th key={c.duration} className="px-3 py-2 text-right">
                        {tg.duration(c.duration)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.id} className="border-t border-ui-line">
                      <td className="px-3 py-2">
                        {z.name} <span className="text-ui-text-3">· {tg.terrain[z.terrain]}</span>
                      </td>
                      {z.chances.map((c) => (
                        <td key={c.duration} className="px-3 py-2 text-right tabular-nums">
                          {pct(Math.round(c.packChance * 10_000) / 100)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
