"use client";

import { useActionState } from "react";
import { deleteTierRuleAction, saveTierRuleAction } from "./actions";
import { ConfirmSubmitButton, FormMessage, SubmitButton } from "@/features/admin/ui";
import { Badge } from "@/ui/content/Badge";
import { Checkbox } from "@/ui/form/Choice";
import { Select } from "@/ui/form/Select";
import { TextField } from "@/ui/form/TextField";
import { useT } from "@/i18n/client";

type SetOption = { id: string; code: string; name: string; isAdult: boolean };
type Rule = { id: string; setId: string; setCode: string; setName: string; setIsAdult: boolean; packsPerMonth: number; active: boolean };

export function RuleRow({ tierId, tierName, rule }: { tierId: string; tierName: string; rule: Rule }) {
  const [state, action] = useActionState(saveTierRuleAction, null);
  const [delState, delAction] = useActionState(deleteTierRuleAction, null);
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-ui-line px-4 py-3 text-sm">
      <form action={action} className="flex flex-1 flex-wrap items-end gap-3">
        <input type="hidden" name="patreonTierId" value={tierId} />
        <input type="hidden" name="tierName" value={tierName} />
        <input type="hidden" name="setId" value={rule.setId} />
        <span className="min-w-40">
          <span className="font-mono">{rule.setCode}</span> · {rule.setName} {rule.setIsAdult && <Badge tone="danger">18+</Badge>}
        </span>
        <TextField label={t.admin.tiers.packsPerMonth} name="packsPerMonth" type="number" min={1} max={50} defaultValue={rule.packsPerMonth} fieldClassName="w-28" />
        <Checkbox name="active" defaultChecked={rule.active} label={t.admin.tiers.active} />
        <SubmitButton variant="secondary">{t.common.save}</SubmitButton>
        <FormMessage state={state} />
      </form>
      <form action={delAction}>
        <input type="hidden" name="ruleId" value={rule.id} />
        <ConfirmSubmitButton title={t.admin.tiers.remove}>{t.admin.tiers.remove}</ConfirmSubmitButton>
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
      <p className="border-t border-ui-line px-4 py-3 text-xs text-ui-text-3">
        {anyPublished ? t.allAssigned : t.publishFirst}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 border-t border-ui-line bg-ui-raised px-4 py-3 text-sm">
      <input type="hidden" name="patreonTierId" value={tierId} />
      <input type="hidden" name="tierName" value={tierName} />
      <input type="hidden" name="active" value="on" />
      <Select
        name="setId"
        label={t.setAria(tierName)}
        hideLabel
        defaultValue={sets[0].id}
        options={sets.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}${s.isAdult ? " (18+)" : ""}` }))}
        className="min-w-64"
      />
      <TextField label={t.packsAria(tierName)} hideLabel name="packsPerMonth" type="number" min={1} max={50} defaultValue={3} fieldClassName="w-24" />
      <span>{t.packsPerMonth}</span>
      <SubmitButton>{t.addSet}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
