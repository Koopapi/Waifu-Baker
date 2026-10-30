"use client";

import type { OpenAllCard } from "@/app/packs/actions";
import { groupByRarity } from "@/domain/opening/open-all";
import { useT } from "@/i18n/client";

/** Spec 019, RF-10 a RF-13: totales del lote y cartas agrupadas por rareza, cada versión una vez con sus copias. */
export function OpenAllSummary({ packs, cards }: { packs: number; cards: OpenAllCard[] }) {
  const tt = useT();
  const t = tt.packs.openAll;
  const groups = groupByRarity(cards);
  const totals = [
    [t.totals.cards, cards.length],
    [t.totals.fresh, cards.filter((c) => c.isNew).length],
    [t.totals.holo, cards.filter((c) => c.holo).length],
  ] as const;
  return (
    <section className="space-y-6" data-testid="open-all-result">
      <h2 className="font-display text-2xl font-semibold">{t.openedTitle(packs)}</h2>
      <dl className="grid grid-cols-3 gap-3" data-testid="open-all-totals">
        {totals.map(([label, n]) => (
          <div key={label} className="rounded-l border border-ui-line bg-ui-raised p-3">
            <dd className="font-display text-2xl font-semibold tabular-nums">{n}</dd>
            <dt className="text-xs text-ui-text-3">{label}</dt>
          </div>
        ))}
      </dl>
      {groups.map((g) => (
        <section key={g.rarity} className="space-y-2" data-testid={`open-all-group-${g.rarity}`}>
          <h3 className={`oa-group__title rarity-${g.rarity}`}>
            {t.group[g.rarity]} · <span className="tabular-nums">{g.count}</span>
          </h3>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {g.versions.map((v) => (
              <li key={`${v.number}-${v.holo}`} className={`oa-card rarity-${g.rarity} ${v.isNew ? "oa-card--new" : ""} ${v.holo ? "oa-card--holo" : ""}`} data-testid="open-all-version">
                <div className="oa-card__art">
                  {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                  <img src={v.card.image} alt={v.card.name} loading="lazy" />
                  {v.copies > 1 && (
                    <span className="oa-card__copies" data-testid="copies">
                      {t.copies(v.copies)}
                    </span>
                  )}
                  {v.isNew && <span className="oa-card__new">{tt.packs.notes.isNew}</span>}
                </div>
                <div className="oa-card__meta">
                  <span className="oa-card__name">{v.card.name}</span>
                  <span className="text-ui-text-3">{tt.packs.notes.owned(v.qtyAfter)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
