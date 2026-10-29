"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMinAgeAction } from "@/app/admin/settings/actions";
import { MIN_AGE_OPTIONS } from "@/domain/legal/documents";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";
import { FormMessage } from "../ui";
import { Button } from "@/ui/action/Button";
import { RadioGroup } from "@/ui/form/Choice";
import { useConfirm } from "@/ui/overlay/Confirm";

/** Spec 010, RF-17: elegir 16 o 18 con confirmación. */
export function MinAgeForm({ current }: { current: number }) {
  const t = useT().admin.settings.minAge;
  const confirm = useConfirm();
  const [age, setAge] = useState(current);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      data-testid="min-age-form"
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        // Spec 011, RF-12: subir la edad mínima es importante; se confirma en el modal propio.
        const raise = age > current;
        if (!(await confirm({ title: t.heading, body: raise ? t.confirmRaise(age) : t.confirmLower(age), confirmLabel: t.save, tone: raise ? "danger" : "default" }))) return;
        start(async () => {
          const r = await setMinAgeAction(age);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      <RadioGroup
        label={t.heading}
        name="minAge"
        appearance="cards"
        value={String(age)}
        onValueChange={(v) => setAge(Number(v))}
        options={MIN_AGE_OPTIONS.map((n) => ({ value: String(n), label: t.option(n) }))}
      />
      <Button type="submit" loading={pending} disabled={age === current}>
        {t.save}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
