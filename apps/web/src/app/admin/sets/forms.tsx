"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSetAction, updateSetAction } from "./actions";
import { Field, FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";
import { useT } from "@/i18n/client";

export function CreateSetForm() {
  const [state, action] = useActionState(createSetAction, null);
  const form = useRef<HTMLFormElement>(null);
  const t = useT().admin.sets;
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-4 rounded-xl border border-ui-line bg-ui-raised p-4 sm:grid-cols-2 lg:grid-cols-[140px_minmax(0,1fr)_120px_auto_auto] lg:items-end">
      <Field label={t.code} hint={t.codeHint}>
        <input name="code" required maxLength={8} placeholder="WB01" className={`${inputCls} uppercase`} />
      </Field>
      <Field label={t.name}>
        <input name="name" required maxLength={80} placeholder={t.namePlaceholder} className={inputCls} />
      </Field>
      <Field label={t.packSize}>
        <input name="packSize" type="number" min={1} max={10} defaultValue={5} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="isAdult" /> {t.adult}
      </label>
      <div className="pb-0.5">
        <SubmitButton>{t.create}</SubmitButton>
      </div>
      <div className="sm:col-span-2 lg:col-span-5">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function EditSetForm({
  set,
  lockedForUsers,
}: {
  set: { id: string; name: string; isAdult: boolean; packSize: number; version: number };
  lockedForUsers: boolean;
}) {
  const [state, action] = useActionState(updateSetAction, null);
  const tt = useT();
  const t = tt.admin.sets;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_140px_auto_auto] lg:items-end" key={set.version}>
      <input type="hidden" name="id" value={set.id} />
      <input type="hidden" name="version" value={set.version} />
      <Field label={t.name}>
        <input name="name" required maxLength={80} defaultValue={set.name} className={inputCls} />
      </Field>
      <Field label={t.packSize}>
        <input name="packSize" type="number" min={1} max={10} defaultValue={set.packSize} disabled={lockedForUsers} className={inputCls} />
      </Field>
      <label className={`flex items-center gap-2 pb-2 text-sm ${lockedForUsers ? "opacity-50" : ""}`}>
        {!lockedForUsers && <input type="hidden" name="adultField" value="1" />}
        <input type="checkbox" name="isAdult" defaultChecked={set.isAdult} disabled={lockedForUsers} /> {t.adult}
      </label>
      <div className="pb-0.5">
        <SubmitButton>{tt.common.save}</SubmitButton>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <FormMessage state={state} />
        {lockedForUsers && <p className="text-xs text-ui-text-3">{t.lockedHint}</p>}
      </div>
    </form>
  );
}
