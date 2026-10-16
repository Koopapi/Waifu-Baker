"use client";

import { useFormStatus } from "react-dom";
import { useEffect, type ReactNode } from "react";
import type { ActionState } from "@/server/auth/admin-action";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { Alert } from "@/ui/feedback/Alert";
import { useToast } from "@/ui/feedback/Toast";
import { useConfirm } from "@/ui/overlay/Confirm";

// Piezas del panel construidas sobre el sistema de diseño (spec 011): botón de envío con estado de carga,
// mensaje del formulario con aviso emergente y etiquetas de estado.

export function SubmitButton({ children, variant = "primary" }: { children: ReactNode; variant?: "primary" | "danger" | "ghost" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending}>
      {children}
    </Button>
  );
}

/** Mensaje junto al formulario y, además, un aviso emergente (spec 010, RF-8). */
export function FormMessage({ state }: { state: ActionState | null }) {
  const toast = useToast();
  const t = useT().common.toast;
  useEffect(() => {
    if (state?.error) toast({ kind: "error", title: t.failed });
    else if (state?.ok) toast({ kind: "success", title: t.saved });
  }, [state, toast, t]);
  if (!state) return null;
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok && state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function StatusBadge({ status }: { status: "draft" | "published" | "archived" }) {
  const t = useT();
  const tone = { draft: "neutral", published: "success", archived: "neutral" } as const;
  return <Badge tone={tone[status]}>{t.admin.status[status]}</Badge>;
}

export function AdultBadge({ adult }: { adult: boolean }) {
  return adult ? <Badge tone="danger">18+</Badge> : <Badge tone="info">SFW</Badge>;
}

/**
 * Spec 011, RF-12: botón de envío para acciones irreversibles. Pide confirmación en el modal propio y solo
 * entonces envía su formulario.
 */
export function ConfirmSubmitButton({ children, title, body, confirmLabel }: { children: ReactNode; title: string; body?: string; confirmLabel?: string }) {
  const confirm = useConfirm();
  const { pending } = useFormStatus();
  return (
    <Button
      type="button"
      variant="danger"
      loading={pending}
      onClick={async (e) => {
        const form = e.currentTarget.form;
        if (form && (await confirm({ title, body, confirmLabel: confirmLabel ?? String(children), tone: "danger" }))) form.requestSubmit();
      }}
    >
      {children}
    </Button>
  );
}
