"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPityDefaultsAction } from "@/app/admin/settings/actions";
import { PITY_RANGE, type PityDefaults } from "@/domain/catalog/default-odds";
import { useAdminDefaultsT } from "@/i18n/admin-defaults";
import type { ActionState } from "@/server/auth/admin-action";
import { FormMessage } from "../ui";
import { Button } from "@/ui/action/Button";
import { TextField } from "@/ui/form/TextField";

/** Spec 028, RF-17: sobres de la garantía de Épica (plata) y de EX (gold) que se proponen a una colección nueva. */
export function PityDefaultsForm({ current }: { current: PityDefaults }) {
  const t = useAdminDefaultsT().pity;
  const [values, setValues] = useState(current);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = values.epic !== current.epic || values.ex !== current.ex;
  const field = (key: keyof PityDefaults, label: string) => (
    <TextField
      label={label}
      hint={t.packs}
      type="number"
      min={PITY_RANGE.min}
      max={PITY_RANGE.max}
      step={1}
      value={values[key]}
      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value === "" ? 0 : Number(e.target.value) }))}
      fieldClassName="w-full sm:w-56"
      className="text-right tabular-nums"
      data-testid={`default-pity-${key}`}
    />
  );
  return (
    <form
      data-testid="pity-defaults-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setPityDefaultsAction(values);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      <div className="flex flex-wrap gap-4">
        {field("epic", t.epic)}
        {field("ex", t.ex)}
      </div>
      <Button type="submit" loading={pending} disabled={!dirty} data-testid="pity-defaults-save">
        {t.save}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
