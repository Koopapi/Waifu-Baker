"use client";

import { useActionState } from "react";
import { deleteTierRuleAction, saveTierRuleAction } from "./actions";
import { FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";
import { useT } from "@/i18n/client";

type SetOption = { id: string; code: string; name: string; isAdult: boolean };
type Rule = { id: string; setId: string; setCode: string; setName: string; setIsAdult: boolean; packsPerMonth: number; active: boolean };

export function RuleRow({ tierId, tierName, rule }: { tierId: string; tierName: string; rule: Rule }) {
  const [state, action] = useActionState(saveTierRuleAction, null);
  const [delState, delAction] = useActionState(deleteTierRuleAction, null);
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-white/5 px-4 py-3 text-sm">
      <form action={action} className="flex flex-1 flex-wrap items-center gap-3">
        <input type="hidden" name="patreonTierId" value={tierId} />
        <input type="hidden" name="tierName" value={tierName} />
        <input type="hidden" name="setId" value={rule.setId} />
        <span className="min-w-40">
          <span className="font-mono">{rule.setCode}</span> · {rule.setName} {rule.setIsAdult && <span className="text-rose-300">18+</span>}
        </span>
        <label className="flex items-center gap-2">
          <input name="packsPerMonth" type="number" min={1} max={50} defaultValue={rule.packsPerMonth} className={`${inputCls} w-20`} /> {t.admin.tiers.packsPerMonth}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={rule.active} /> {t.admin.tiers.active}
        </label>
        <SubmitButton variant="ghost">{t.common.save}</SubmitButton>
        <FormMessage state={state} />
      </form>
      <form action={delAction}>
        <input type="hidden" name="ruleId" value={rule.id} />
        <SubmitButton variant="danger">{t.admin.tiers.remove}</SubmitButton>
        <FormMessage state={delState} />
      </form>
    </div>
  );
}

export function AddRuleForm({ tierId, tierName, sets, anyPublished }: { tierId: string; tierName: string; sets: SetOption[]; anyPublished: boolean }) {
  const [state, action] = useActionState(saveTierRuleAction, null);
  const t = useT().admin.tiers;
  if (sets.length === 0) {
    return (
      <p className="border-t border-white/5 px-4 py-3 text-xs text-white/40">
        {anyPublished ? t.allAssigned : t.publishFirst}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 border-t border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
      <input type="hidden" name="patreonTierId" value={tierId} />
      <input type="hidden" name="tierName" value={tierName} />
      <input type="hidden" name="active" value="on" />
      <select name="setId" required aria-label={t.setAria(tierName)} className={`${inputCls} w-auto`}>
        {sets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.code} · {s.name}
            {s.isAdult ? " (18+)" : ""}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2">
        <input name="packsPerMonth" type="number" min={1} max={50} defaultValue={3} className={`${inputCls} w-20`} aria-label={t.packsAria(tierName)} /> {t.packsPerMonth}
      </label>
      <SubmitButton>{t.addSet}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
