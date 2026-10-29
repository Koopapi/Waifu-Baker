"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCharacterAction, deleteCharacterAction, updateCharacterAction } from "./actions";
import { ConfirmSubmitButton, FormMessage, SubmitButton } from "@/features/admin/ui";
import { Card } from "@/ui/content/Card";
import { Select } from "@/ui/form/Select";
import { TextArea, TextField } from "@/ui/form/TextField";
import { ROLES, TERRAINS } from "@/domain/expeditions/rules";
import { useT } from "@/i18n/client";
import { useGamesT } from "@/i18n/games";

type Character = { id: string; name: string; slug: string; bio: string; identityTags: string; terrain: string | null; role: string | null; cardCount: number };

function CharacterFields({ c }: { c?: Character }) {
  const t = useT().admin.characters;
  const tg = useGamesT();
  return (
    <>
      <TextField label={t.name} name="name" required maxLength={60} defaultValue={c?.name} />
      <TextArea label={t.bio} name="bio" rows={2} defaultValue={c?.bio} />
      <TextArea label={t.identityTags} hint={t.identityTagsHint} name="identityTags" rows={2} defaultValue={c?.identityTags} className="font-mono text-xs" />
      {/* Spec 020, RF-27: terreno y rol en Expediciones. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label={tg.admin.characterTerrain} name="terrain" defaultValue={c?.terrain ?? ""} options={[{ value: "", label: tg.admin.none }, ...TERRAINS.map((x) => ({ value: x, label: tg.terrain[x] }))]} />
        <Select
          label={tg.admin.characterRole}
          name="role"
          defaultValue={c?.role ?? ""}
          options={[{ value: "", label: tg.admin.none }, ...ROLES.map((x) => ({ value: x, label: tg.role[x], description: tg.roleEffect[x] }))]}
        />
      </div>
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
    <Card as="div">
      {/* El título va dentro del formulario: las pruebas localizan el formulario por él. */}
      <form ref={form} action={action} className="space-y-3">
        <h2 className="text-base font-semibold">{t.new}</h2>
        <CharacterFields />
        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton>{t.create}</SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>
    </Card>
  );
}

export function CharacterRow({ c }: { c: Character }) {
  const [state, action] = useActionState(updateCharacterAction, null);
  const [delState, delAction] = useActionState(deleteCharacterAction, null);
  const tt = useT();
  const t = tt.admin.characters;
  return (
    <details className="group rounded-l bg-ui-nav open:bg-ui-nav">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <span className="font-medium">{c.name}</span>
        <span className="flex items-center gap-3 text-xs text-ui-text-3">
          <span className="font-mono">{c.slug}</span>
          <span>{t.cardCount(c.cardCount)}</span>
          <span className="transition-transform duration-[var(--duration-fast)] group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="space-y-3 border-t border-ui-line p-4">
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={c.id} />
          <CharacterFields c={c} />
          <div className="flex flex-wrap items-center gap-4">
            <SubmitButton>{tt.common.save}</SubmitButton>
            <FormMessage state={state} />
          </div>
        </form>
        <form action={delAction} className="flex items-center gap-4 border-t border-ui-line pt-3">
          <input type="hidden" name="id" value={c.id} />
          <ConfirmSubmitButton title={t.delete}>{t.delete}</ConfirmSubmitButton>
          <FormMessage state={delState} />
        </form>
      </div>
    </details>
  );
}
