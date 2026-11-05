"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCardDefaultsAction } from "@/app/admin/settings/actions";
import { BORDER_SETTING_RANGE, SEAL_SIZE_RANGE, type CardDefaults } from "@/domain/cards/card-defaults";
import { useAdminDefaultsT } from "@/i18n/admin-defaults";
import type { ActionState } from "@/server/auth/admin-action";
import { FormMessage } from "../ui";
import { Button } from "@/ui/action/Button";
import { Slider } from "@/ui/form/Slider";

/** Spec 028, RF-15: tamaño del sello de texto (4 a 40) y grosor del borde (0 a 8) de las cartas nuevas. */
export function CardDefaultsForm({ current }: { current: CardDefaults }) {
  const t = useAdminDefaultsT().cards;
  const [values, setValues] = useState(current);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = values.sealSize !== current.sealSize || values.border !== current.border;
  return (
    <form
      data-testid="card-defaults-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setCardDefaultsAction(values);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label={t.sealSize} value={values.sealSize} min={SEAL_SIZE_RANGE.min} max={SEAL_SIZE_RANGE.max} onValueChange={(sealSize) => setValues((v) => ({ ...v, sealSize }))} data-testid="default-seal-size" />
        <Slider
          label={t.border}
          value={values.border}
          min={BORDER_SETTING_RANGE.min}
          max={BORDER_SETTING_RANGE.max}
          step={0.1}
          format={(v) => v.toFixed(1)}
          onValueChange={(border) => setValues((v) => ({ ...v, border }))}
          data-testid="default-border"
        />
      </div>
      <Button type="submit" loading={pending} disabled={!dirty} data-testid="card-defaults-save">
        {t.save}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
