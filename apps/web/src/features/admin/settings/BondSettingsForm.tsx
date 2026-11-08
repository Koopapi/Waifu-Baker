"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBondSettingsAction } from "@/app/admin/settings/actions";
import { RARITIES } from "@/domain/catalog/card-rules";
import { CRAFTABLE, TITLE_LEVELS, type BondSettings } from "@/domain/bonds/settings";
import { useAdminDefaultsT } from "@/i18n/admin-defaults";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";
import { FormMessage } from "../ui";
import { Button } from "@/ui/action/Button";
import { TextField } from "@/ui/form/TextField";

const num = (v: string) => (v === "" ? 0 : Number(v));

/** Spec 029, RF-14 y RF-22: puntos y polvo por rareza, factor holo, costes de fabricar y títulos de nivel. */
export function BondSettingsForm({ current }: { current: BondSettings }) {
  const t = useAdminDefaultsT().bond;
  const tt = useT();
  const [v, setV] = useState<BondSettings>(current);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = JSON.stringify(v) !== JSON.stringify(current);
  const field = (label: string, value: number | string, onChange: (x: string) => void, testId: string, type = "number") => (
    <TextField label={label} type={type} value={value} onChange={(e) => onChange(e.target.value)} fieldClassName="w-full" className={type === "number" ? "text-right tabular-nums" : ""} data-testid={testId} />
  );
  const group = (heading: string, children: React.ReactNode) => (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wide text-ui-text-2">{heading}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{children}</div>
    </fieldset>
  );
  return (
    <form
      data-testid="bond-settings-form"
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setBondSettingsAction(v);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      {group(t.points, RARITIES.map((r) => <div key={r}>{field(tt.common.rarity[r], v.points[r], (x) => setV((p) => ({ ...p, points: { ...p.points, [r]: num(x) } })), `bond-points-${r}`)}</div>))}
      {group(t.dust, RARITIES.map((r) => <div key={r}>{field(tt.common.rarity[r], v.dust[r], (x) => setV((p) => ({ ...p, dust: { ...p.dust, [r]: num(x) } })), `bond-dust-${r}`)}</div>))}
      {group(t.craftCost, CRAFTABLE.map((r) => <div key={r}>{field(tt.common.rarity[r], v.craftCost[r], (x) => setV((p) => ({ ...p, craftCost: { ...p.craftCost, [r]: num(x) } })), `bond-cost-${r}`)}</div>))}
      <div className="w-40">{field(t.holoFactor, v.holoFactor, (x) => setV((p) => ({ ...p, holoFactor: num(x) })), "bond-holo-factor")}</div>
      {group(
        t.titles,
        TITLE_LEVELS.map((l) => (
          <div key={l}>{field(t.titleLevel(l), v.titles[`${l}`] ?? "", (x) => setV((p) => ({ ...p, titles: { ...p.titles, [`${l}`]: x } })), `bond-title-${l}`, "text")}</div>
        )),
      )}
      <Button type="submit" loading={pending} disabled={!dirty} data-testid="bond-settings-save">
        {t.save}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
