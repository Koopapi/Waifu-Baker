"use client";

import { useState, useTransition } from "react";
import { reconcileNowAction } from "@/app/admin/tiers/actions";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import type { ActionState } from "@/server/auth/admin-action";

/** Spec 001, RF-17: revisión manual de todos los miembros (además de la automática cada 6 h). */
export function ReconcileButton() {
  const t = useT().admin.tiers;
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" loading={pending} onClick={() => start(async () => setState(await reconcileNowAction()))} data-testid="reconcile-now">
        {pending ? t.syncing : t.sync}
      </Button>
      {state && <Alert tone={state.error ? "danger" : "success"}>{state.error ?? state.message}</Alert>}
    </div>
  );
}
