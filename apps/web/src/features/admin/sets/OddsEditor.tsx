"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { saveOddsAction } from "@/app/admin/sets/actions";
import type { ActionState } from "@/server/auth/admin-action";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber, formatPercent } from "@/i18n/format";

type Slot = Record<Rarity, number>;

/** RF-20: pesos por ranura y rareza, con suma por ranura y probabilidad de holo. */
export function OddsEditor({
  setId,
  version,
  slots: initial,
  holoChance,
  pityThreshold,
  locked,
  cardCounts,
}: {
  setId: string;
  version: number;
  slots: Slot[];
  holoChance: number;
  pityThreshold: number;
  locked: boolean;
  cardCounts: Record<Rarity, number>;
}) {
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [holo, setHolo] = useState(Math.round(holoChance * 1000) / 10);
  const [pity, setPity] = useState(pityThreshold);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const tt = useT();
  const t = tt.admin.odds;
  const locale = useLocale();
  // Tras guardar, el servidor devuelve otra versión: se sincronizan los datos sin remontar el
  // editor, para que el mensaje de confirmación siga visible.
  const initialKey = JSON.stringify([initial, holoChance, pityThreshold]);
  useEffect(() => {
    const [s, h, p] = JSON.parse(initialKey) as [Slot[], number, number];
    setSlots(s);
    setHolo(Math.round(h * 1000) / 10);
    setPity(p);
  }, [initialKey, version]);
  const sums = useMemo(() => slots.map((s) => RARITIES.reduce((a, r) => a + (Number(s[r]) || 0), 0)), [slots]);
  const dirty = JSON.stringify(slots) !== JSON.stringify(initial) || holo !== Math.round(holoChance * 1000) / 10 || pity !== pityThreshold;
  const expected = RARITIES.map((r) => [r, slots.reduce((a, s) => a + (Number(s[r]) || 0) / 100, 0)] as const);

  const set = (i: number, r: Rarity, v: string) => setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, [r]: v === "" ? 0 : Number(v) } : s)));

  return (
    <div className="space-y-4" id="probabilidades">
      <div className="overflow-x-auto rounded-xl border border-ui-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ui-raised text-xs uppercase tracking-wider text-ui-text-3">
            <tr>
              <th className="px-3 py-2 text-left">{t.slot}</th>
              {RARITIES.map((r) => (
                <th key={r} className="px-2 py-2 text-right">
                  {tt.common.rarity[r]}
                  <span className="block font-normal normal-case tracking-normal text-ui-text-3">{t.cardCount(cardCounts[r])}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-right">{t.sum}</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s, i) => (
              <tr key={i} id={`ranura-${i + 1}`} className="border-t border-ui-line">
                <td className="px-3 py-2 text-ui-text-2">
                  {i + 1}
                  {i === slots.length - 1 && <span className="ml-2 text-xs text-ui-text-3">{t.guaranteed}</span>}
                </td>
                {RARITIES.map((r) => (
                  <td key={r} className="px-2 py-1.5 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={s[r]}
                      disabled={locked}
                      aria-label={t.slotAria(i + 1, tt.common.rarity[r])}
                      onChange={(e) => set(i, r, e.target.value)}
                      className={`w-20 rounded-md border bg-black/20 px-2 py-1 text-right tabular-nums disabled:opacity-60 ${s[r] > 0 && cardCounts[r] === 0 ? "border-amber-400/60" : "border-ui-line"}`}
                    />
                  </td>
                ))}
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${Math.abs(sums[i] - 100) < 1e-6 ? "text-emerald-300" : "text-red-300"}`}>
                  {formatPercent(locale, sums[i])}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-ui-line text-xs text-ui-text-3">
            <tr>
              <td className="px-3 py-2">{t.expected}</td>
              {expected.map(([r, e]) => (
                <td key={r} className="px-2 py-2 text-right tabular-nums">
                  {formatNumber(locale, e, 2)}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t.holo}
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={holo}
            disabled={locked}
            onChange={(e) => setHolo(Number(e.target.value))}
            className="w-20 rounded-md border border-ui-line bg-black/20 px-2 py-1 text-right tabular-nums disabled:opacity-60"
          />
          %
        </label>
        <label className="flex items-center gap-2 text-sm" title={t.pityTitle}>
          {t.pity}
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={pity}
            disabled={locked}
            aria-label={t.pityAria}
            onChange={(e) => setPity(Number(e.target.value))}
            className="w-16 rounded-md border border-ui-line bg-black/20 px-2 py-1 text-right tabular-nums disabled:opacity-60"
          />
          {t.packs} {pity === 0 && <span className="text-ui-text-3">{t.disabled}</span>}
        </label>
        {!locked && (
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const r = await saveOddsAction(setId, version, slots, holo, pity);
                setState(r);
                if (r.ok) router.refresh();
              })
            }
            className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-4 py-1.5 text-sm font-semibold text-ui-on-accent disabled:opacity-50"
          >
            {pending ? tt.common.saving : t.save}
          </button>
        )}
        {locked && <span className="text-xs text-ui-text-3">{t.locked}</span>}
        {state && <span className={`text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>{state.error ?? state.message}</span>}
      </div>
    </div>
  );
}
