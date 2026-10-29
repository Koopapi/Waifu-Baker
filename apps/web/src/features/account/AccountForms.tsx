"use client";

import { useActionState, useTransition } from "react";
import { declareAdultAction, deactivateAccountAction } from "@/app/(app)/account/actions";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { Checkbox } from "@/ui/form/Choice";
import { useConfirm } from "@/ui/overlay/Confirm";

export function DeclareAdultForm() {
  const t = useT().account.adult;
  const [state, action, pending] = useActionState(declareAdultAction, null);
  return (
    <form action={action} className="space-y-3" data-testid="declare-adult">
      <Checkbox name="confirm" required label={t.confirm} />
      <Button loading={pending}>{t.submit}</Button>
      {state && <Alert tone={state.error ? "danger" : "success"}>{state.error ?? state.message}</Alert>}
    </form>
  );
}

/** Spec 001, RF-22 y spec 011, RF-12: borrar la cuenta pide confirmación en un modal con el botón de peligro. */
export function DeleteAccountButton() {
  const t = useT().account.delete;
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      loading={pending}
      onClick={async () => {
        if (await confirm({ title: t.title, body: t.confirm, confirmLabel: t.button, tone: "danger" })) start(() => deactivateAccountAction());
      }}
      data-testid="delete-account"
    >
      {t.button}
    </Button>
  );
}
