"use client";

import { useActionState, useTransition } from "react";
import { declareAdultAction, deactivateAccountAction } from "@/app/(app)/cuenta/actions";
import { useT } from "@/i18n/client";

export function DeclareAdultForm() {
  const t = useT().account.adult;
  const [state, action, pending] = useActionState(declareAdultAction, null);
  return (
    <form action={action} className="space-y-3" data-testid="declare-adult">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" required />
        {t.confirm}
      </label>
      <button disabled={pending} className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-4 py-2 text-sm font-semibold text-ui-on-accent disabled:opacity-50">
        {t.submit}
      </button>
      {state && <p role="status" className={`text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>{state.error ?? state.message}</p>}
    </form>
  );
}

export function DeleteAccountButton() {
  const t = useT().account.delete;
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(t.confirm)) start(() => deactivateAccountAction());
      }}
      className="rounded-full border border-red-400/40 px-4 py-2 text-sm text-red-200 hover:bg-red-400/10 disabled:opacity-50"
      data-testid="delete-account"
    >
      {t.button}
    </button>
  );
}
