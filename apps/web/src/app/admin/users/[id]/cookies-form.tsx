"use client";

import { useActionState, useEffect, useRef } from "react";
import { adjustCookiesAction } from "../actions";
import { Field, FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";
import { useT } from "@/i18n/client";

/** Spec 009, RF-21. */
export function CookiesForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(adjustCookiesAction, null);
  const form = useRef<HTMLFormElement>(null);
  const t = useT().admin.users.rewards;
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end" data-testid="cookies-form">
      <input type="hidden" name="userId" value={userId} />
      <Field label={t.amount}>
        <input name="amount" type="number" step={1} required className={inputCls} />
      </Field>
      <Field label={t.reason}>
        <input name="reason" required minLength={3} maxLength={200} className={inputCls} />
      </Field>
      <SubmitButton>{t.submit}</SubmitButton>
      <div className="md:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
