"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMinAgeAction } from "@/app/admin/ajustes/actions";
import { MIN_AGE_OPTIONS } from "@/domain/legal/documents";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";
import { FormMessage } from "../ui";

/** Spec 010, RF-17: elegir 16 o 18 con confirmación. */
export function MinAgeForm({ current }: { current: number }) {
  const t = useT().admin.settings.minAge;
  const [age, setAge] = useState(current);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      data-testid="min-age-form"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm(age > current ? t.confirmRaise(age) : t.confirmLower(age))) return;
        start(async () => {
          const r = await setMinAgeAction(age);
          setState(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      <fieldset className="flex gap-2">
        <legend className="sr-only">{t.heading}</legend>
        {MIN_AGE_OPTIONS.map((n) => (
          <label
            key={n}
            className={`btn cursor-pointer border px-5 py-2.5 text-sm ${age === n ? "border-ui-accent-text bg-ui-accent/15 text-ui-text" : "border-ui-line text-ui-text-2 hover:bg-ui-hover"}`}
          >
            <input type="radio" name="minAge" value={n} checked={age === n} onChange={() => setAge(n)} className="sr-only" />
            {t.option(n)}
          </label>
        ))}
      </fieldset>
      <button disabled={pending || age === current} className="btn btn-primary px-4 py-2 text-sm">
        {t.save}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
