"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSetAction, updateSetAction } from "./actions";
import { Field, FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";

export function CreateSetForm() {
  const [state, action] = useActionState(createSetAction, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-[140px_minmax(0,1fr)_120px_auto_auto] lg:items-end">
      <Field label="Código" hint="2–8 letras o números">
        <input name="code" required maxLength={8} placeholder="WB01" className={`${inputCls} uppercase`} />
      </Field>
      <Field label="Nombre">
        <input name="name" required maxLength={80} placeholder="Colección base" className={inputCls} />
      </Field>
      <Field label="Cartas por sobre">
        <input name="packSize" type="number" min={1} max={10} defaultValue={5} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="isAdult" /> Colección 18+
      </label>
      <div className="pb-0.5">
        <SubmitButton>Crear colección</SubmitButton>
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
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_140px_auto_auto] lg:items-end" key={set.version}>
      <input type="hidden" name="id" value={set.id} />
      <input type="hidden" name="version" value={set.version} />
      <Field label="Nombre">
        <input name="name" required maxLength={80} defaultValue={set.name} className={inputCls} />
      </Field>
      <Field label="Cartas por sobre">
        <input name="packSize" type="number" min={1} max={10} defaultValue={set.packSize} disabled={lockedForUsers} className={inputCls} />
      </Field>
      <label className={`flex items-center gap-2 pb-2 text-sm ${lockedForUsers ? "opacity-50" : ""}`}>
        {!lockedForUsers && <input type="hidden" name="adultField" value="1" />}
        <input type="checkbox" name="isAdult" defaultChecked={set.isAdult} disabled={lockedForUsers} /> Colección 18+
      </label>
      <div className="pb-0.5">
        <SubmitButton>Guardar</SubmitButton>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <FormMessage state={state} />
        {lockedForUsers && <p className="text-xs text-white/40">Publicada: el tamaño del sobre y la clasificación 18+ están bloqueados (RF-8).</p>}
      </div>
    </form>
  );
}
