"use client";

import { useState, useTransition } from "react";
import { reconcileNowAction } from "@/app/admin/tiers/actions";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";

/** Spec 001, RF-17: revisión manual de todos los miembros (además de la automática cada 6 h). */
export function ReconcileButton() {
  const t = useT().admin.tiers;
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await reconcileNowAction()))}
        className="rounded-full border border-white/20 px-4 py-1.5 text-sm disabled:opacity-50"
        data-testid="reconcile-now"
      >
        {pending ? t.syncing : t.sync}
      </button>
      {state && <span className={`text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>{state.error ?? state.message}</span>}
    </div>
  );
}
