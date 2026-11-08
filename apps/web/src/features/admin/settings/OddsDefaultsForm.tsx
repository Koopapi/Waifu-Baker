"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOddsDefaultsAction } from "@/app/admin/settings/actions";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { PACK_KINDS, TABLE_ROWS, type OddsTables, type PackKind, type TableRow } from "@/domain/catalog/default-odds";
import { formatPercent } from "@/i18n/format";
import { useAdminDefaultsT } from "@/i18n/admin-defaults";
import { useLocale, useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";
import { FormMessage } from "../ui";
import { Button } from "@/ui/action/Button";
import { TextField } from "@/ui/form/TextField";

const sumOf = (row: Record<Rarity, number>) => RARITIES.reduce((a, r) => a + (Number(row[r]) || 0), 0);

/**
 * Spec 028, RF-16: probabilidades por ranura que se proponen a una colección nueva, para el sobre plata y el gold. Cada
 * fila muestra su suma; la que no llega a 100 se marca, y el servidor no guarda nada si alguna falla.
 */
export function OddsDefaultsForm({ current }: { current: OddsTables }) {
  const t = useAdminDefaultsT().odds;
  const tt = useT();
  const locale = useLocale();
  const [tables, setTables] = useState<OddsTables>(current);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = JSON.stringify(tables) !== JSON.stringify(current);
  const set = (kind: PackKind, row: TableRow, r: Rarity, v: string) =>
    setTables((prev) => ({ ...prev, [kind]: { ...prev[kind], [row]: { ...prev[kind][row], [r]: v === "" ? 0 : Number(v) } } }));
  return (
    <form
      data-testid="odds-defaults-form"
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setOddsDefaultsAction(tables);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      {PACK_KINDS.map((kind) => (
        <div key={kind} className="space-y-2" data-testid={`odds-defaults-${kind}`}>
          <h3 className="text-sm font-semibold">{t.kinds[kind]}</h3>
          <div className="overflow-x-auto rounded-l border border-ui-line">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-ui-raised text-xs uppercase tracking-wider text-ui-text-3">
                <tr>
                  <th className="px-3 py-2 text-left">{t.row}</th>
                  {RARITIES.map((r) => (
                    <th key={r} className="px-2 py-2 text-right">
                      {tt.common.rarity[r]}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">{t.sum}</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => {
                  const sum = sumOf(tables[kind][row]);
                  const ok = Math.abs(sum - 100) < 1e-6;
                  return (
                    <tr key={row} className="border-t border-ui-line" data-testid={`odds-defaults-${kind}-${row}`} data-invalid={ok ? undefined : "true"}>
                      <td className="px-3 py-2 text-ui-text-2">{t.rows[row]}</td>
                      {RARITIES.map((r) => (
                        <td key={r} className="px-2 py-1.5 text-right">
                          <TextField
                            label={t.cell(t.rows[row], tt.common.rarity[r])}
                            hideLabel
                            aria-label={`${t.kinds[kind]}: ${t.cell(t.rows[row], tt.common.rarity[r])}`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={tables[kind][row][r]}
                            onChange={(e) => set(kind, row, r, e.target.value)}
                            fieldClassName="inline-block"
                            className="h-8 w-20 px-2 text-right tabular-nums"
                          />
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${ok ? "text-ui-success-text" : "text-ui-danger-text"}`}>{formatPercent(locale, +sum.toFixed(4))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <Button type="submit" loading={pending} disabled={!dirty} data-testid="odds-defaults-save">
        {t.save}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
