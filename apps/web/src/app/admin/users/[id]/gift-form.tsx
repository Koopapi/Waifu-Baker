"use client";

import { useActionState, useEffect, useRef } from "react";
import { giftPacksAction } from "../actions";
import { Field, FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";
import { useT } from "@/i18n/client";

export function GiftForm({ userId, sets }: { userId: string; sets: { id: string; code: string; name: string; isAdult: boolean; blocked: boolean }[] }) {
  const [state, action] = useActionState(giftPacksAction, null);
  const form = useRef<HTMLFormElement>(null);
  const t = useT().admin.users;
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  if (sets.length === 0) return <p className="text-sm text-ui-text-3">{t.giftNoSets}</p>;
  return (
    <form ref={form} action={action} className="grid gap-4 md:grid-cols-[1fr_120px] md:items-end">
      <input type="hidden" name="userId" value={userId} />
      <Field label={t.giftSet}>
        <select name="setId" className={inputCls}>
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name}
              {s.isAdult ? " (18+)" : ""}
              {s.blocked ? t.requiresAge : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.giftCount}>
        <input name="count" type="number" min={1} max={20} defaultValue={1} className={inputCls} />
      </Field>
      <div className="md:col-span-2">
        <Field label={t.reason} hint={t.reasonHint}>
          <input name="reason" required minLength={3} maxLength={200} className={inputCls} />
        </Field>
      </div>
      <div className="flex items-center gap-4 md:col-span-2">
        <SubmitButton>{t.gift}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
