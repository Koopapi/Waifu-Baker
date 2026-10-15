"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCharacterAction, deleteCharacterAction, updateCharacterAction } from "./actions";
import { Field, FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";

type Character = { id: string; name: string; slug: string; bio: string; identityTags: string; cardCount: number };

function CharacterFields({ c }: { c?: Character }) {
  return (
    <>
      <Field label="Nombre">
        <input name="name" required maxLength={60} defaultValue={c?.name} className={inputCls} />
      </Field>
      <Field label="Descripción">
        <textarea name="bio" rows={2} defaultValue={c?.bio} className={inputCls} />
      </Field>
      <Field label="Tags de identidad" hint="Bloque fijo de tags para generar su arte: pelo, ojos, accesorio, outfit.">
        <textarea name="identityTags" rows={2} defaultValue={c?.identityTags} className={`${inputCls} font-mono text-xs`} />
      </Field>
    </>
  );
}

export function CreateCharacterForm() {
  const [state, action] = useActionState(createCharacterAction, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="font-semibold">Nuevo personaje</h2>
      <CharacterFields />
      <div className="flex items-center gap-4">
        <SubmitButton>Crear personaje</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function CharacterRow({ c }: { c: Character }) {
  const [state, action] = useActionState(updateCharacterAction, null);
  const [delState, delAction] = useActionState(deleteCharacterAction, null);
  return (
    <details className="group rounded-xl border border-white/10 bg-white/[0.02] open:bg-white/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <span className="font-medium">{c.name}</span>
        <span className="flex items-center gap-3 text-xs text-white/50">
          <span className="font-mono">{c.slug}</span>
          <span>{c.cardCount} carta(s)</span>
          <span className="transition group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-white/10 p-4">
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={c.id} />
          <CharacterFields c={c} />
          <div className="flex items-center gap-4">
            <SubmitButton>Guardar</SubmitButton>
            <FormMessage state={state} />
          </div>
        </form>
        <form action={delAction} className="flex items-center gap-4 border-t border-white/10 pt-3">
          <input type="hidden" name="id" value={c.id} />
          <SubmitButton variant="danger">Borrar personaje</SubmitButton>
          <FormMessage state={delState} />
        </form>
      </div>
    </details>
  );
}
