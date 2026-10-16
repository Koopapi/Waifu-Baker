"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCharacterAction, deleteCharacterAction, updateCharacterAction } from "./actions";
import { Field, FormMessage, inputCls, SubmitButton } from "@/features/admin/ui";
import { useT } from "@/i18n/client";

type Character = { id: string; name: string; slug: string; bio: string; identityTags: string; cardCount: number };

function CharacterFields({ c }: { c?: Character }) {
  const t = useT().admin.characters;
  return (
    <>
      <Field label={t.name}>
        <input name="name" required maxLength={60} defaultValue={c?.name} className={inputCls} />
      </Field>
      <Field label={t.bio}>
        <textarea name="bio" rows={2} defaultValue={c?.bio} className={inputCls} />
      </Field>
      <Field label={t.identityTags} hint={t.identityTagsHint}>
        <textarea name="identityTags" rows={2} defaultValue={c?.identityTags} className={`${inputCls} font-mono text-xs`} />
      </Field>
    </>
  );
}

export function CreateCharacterForm() {
  const [state, action] = useActionState(createCharacterAction, null);
  const form = useRef<HTMLFormElement>(null);
  const t = useT().admin.characters;
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3 rounded-xl border border-ui-line bg-ui-raised p-4">
      <h2 className="font-semibold">{t.new}</h2>
      <CharacterFields />
      <div className="flex items-center gap-4">
        <SubmitButton>{t.create}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function CharacterRow({ c }: { c: Character }) {
  const [state, action] = useActionState(updateCharacterAction, null);
  const [delState, delAction] = useActionState(deleteCharacterAction, null);
  const tt = useT();
  const t = tt.admin.characters;
  return (
    <details className="group rounded-xl border border-ui-line bg-ui-raised open:bg-ui-raised">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <span className="font-medium">{c.name}</span>
        <span className="flex items-center gap-3 text-xs text-ui-text-3">
          <span className="font-mono">{c.slug}</span>
          <span>{t.cardCount(c.cardCount)}</span>
          <span className="transition group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-ui-line p-4">
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={c.id} />
          <CharacterFields c={c} />
          <div className="flex items-center gap-4">
            <SubmitButton>{tt.common.save}</SubmitButton>
            <FormMessage state={state} />
          </div>
        </form>
        <form action={delAction} className="flex items-center gap-4 border-t border-ui-line pt-3">
          <input type="hidden" name="id" value={c.id} />
          <SubmitButton variant="danger">{t.delete}</SubmitButton>
          <FormMessage state={delState} />
        </form>
      </div>
    </details>
  );
}
