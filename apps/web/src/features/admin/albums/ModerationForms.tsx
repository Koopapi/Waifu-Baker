"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReviewAction, hideAlbumAction, rejectReviewAction } from "@/app/admin/albumes/actions";
import { MODERATION_REASONS, type ModerationReason } from "@/domain/collection/moderation";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";
import { Button } from "@/ui/action/Button";
import { RadioGroup } from "@/ui/form/Choice";
import { TextArea } from "@/ui/form/TextField";
import { useToast } from "@/ui/feedback/Toast";
import { useConfirm } from "@/ui/overlay/Confirm";
import { FormMessage } from "../ui";

/**
 * Al acertar, la ficha cambia de estado y el formulario desaparece: el éxito va en un aviso emergente y
 * solo los errores se quedan junto al formulario.
 */
function useModerationResult(setState: (s: ActionState | null) => void) {
  const toast = useToast();
  const router = useRouter();
  return (r: ActionState) => {
    if (!r.ok) return setState(r);
    setState(null);
    toast({ kind: "success", title: r.message ?? "" });
    router.refresh();
  };
}

/** Spec 012, RF-4: ocultar con motivo, nota y confirmación. */
export function HideAlbumForm({ userId, alias }: { userId: string; alias: string }) {
  const tt = useT();
  const t = tt.admin.albums;
  const reasons = tt.collection.album.moderation.reasons;
  const confirm = useConfirm();
  const [reason, setReason] = useState<ModerationReason>("offensive_alias");
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const done = useModerationResult(setState);
  return (
    <form
      className="space-y-4"
      data-testid="hide-album-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!(await confirm({ title: t.hide, body: t.confirmHide(alias), confirmLabel: t.hide, tone: "danger" }))) return;
        start(async () => {
          done(await hideAlbumAction(userId, reason, note));
        });
      }}
    >
      <p className="text-sm text-ui-text-2">{t.hideIntro}</p>
      <RadioGroup label={t.reason} value={reason} onValueChange={(v) => setReason(v as ModerationReason)} options={MODERATION_REASONS.map((r) => ({ value: r, label: reasons[r] }))} />
      <TextArea label={t.note} hint={t.noteHint} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" variant="danger" loading={pending}>
        {t.hide}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

/** Spec 012, RF-11 y RF-12: decidir una revisión pendiente. */
export function ReviewDecision({ userId }: { userId: string }) {
  const t = useT().admin.albums;
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const done = useModerationResult(setState);
  const run = (fn: () => Promise<ActionState>) => start(async () => done(await fn()));
  return (
    <div className="space-y-4" data-testid="review-decision">
      <TextArea label={t.rejectNote} hint={t.noteHint} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button variant="success" loading={pending} onClick={() => run(() => approveReviewAction(userId))}>
          {t.approve}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => run(() => rejectReviewAction(userId, note))}>
          {t.reject}
        </Button>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
