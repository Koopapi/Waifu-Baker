"use client";

import { useActionState, useEffect, useRef } from "react";
import { giftPacksAction } from "../actions";
import { FormMessage, SubmitButton } from "@/features/admin/ui";
import { Select } from "@/ui/form/Select";
import { TextField } from "@/ui/form/TextField";
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
      <Select
        label={t.giftSet}
        name="setId"
        defaultValue={sets[0].id}
        searchable={sets.length > 8}
        options={sets.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}${s.isAdult ? " (18+)" : ""}${s.blocked ? t.requiresAge : ""}` }))}
      />
      <TextField label={t.giftCount} name="count" type="number" min={1} max={20} defaultValue={1} />
      <TextField label={t.reason} hint={t.reasonHint} name="reason" required minLength={3} maxLength={200} fieldClassName="md:col-span-2" />
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <SubmitButton>{t.gift}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
