"use client";

import { useActionState, useEffect, useRef } from "react";
import { giftPacksAction } from "../actions";
import { Field, FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";

export function GiftForm({ userId, sets }: { userId: string; sets: { id: string; code: string; name: string; isAdult: boolean; blocked: boolean }[] }) {
  const [state, action] = useActionState(giftPacksAction, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  if (sets.length === 0) return <p className="text-sm text-white/50">No hay colecciones publicadas de las que regalar sobres.</p>;
  return (
    <form ref={form} action={action} className="grid gap-4 md:grid-cols-[1fr_120px] md:items-end">
      <input type="hidden" name="userId" value={userId} />
      <Field label="Colección">
        <select name="setId" className={inputCls}>
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name}
              {s.isAdult ? " (18+)" : ""}
              {s.blocked ? " · requiere edad verificada" : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Sobres">
        <input name="count" type="number" min={1} max={20} defaultValue={1} className={inputCls} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Motivo (obligatorio)" hint="Queda en el historial: soporte, sorteo, compensación…">
          <input name="reason" required minLength={3} maxLength={200} className={inputCls} />
        </Field>
      </div>
      <div className="flex items-center gap-4 md:col-span-2">
        <SubmitButton>Regalar sobres</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
