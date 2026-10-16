"use client";

import { useFormStatus } from "react-dom";
import { useEffect, type ReactNode } from "react";
import { useToast } from "@/features/ui/Toast";
import type { ActionState } from "@/server/auth/admin-action";
import { useT } from "@/i18n/client";

export const inputCls =
  "w-full rounded-md border border-ui-line bg-ui-rail px-3 py-2 text-sm outline-none transition-colors hover:border-ui-hover focus:border-ui-accent-text disabled:opacity-50";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wider text-ui-text-2">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ui-text-3">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ children, variant = "primary" }: { children: ReactNode; variant?: "primary" | "danger" | "ghost" }) {
  const { pending } = useFormStatus();
  const t = useT();
  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
        ? "border border-red-400/40 text-red-300 hover:bg-red-400/10"
        : "btn-secondary";
  return (
    <button disabled={pending} className={`btn px-4 py-2 text-sm ${cls}`}>
      {pending ? t.common.saving : children}
    </button>
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
  if (state.error)
    return (
      <p role="alert" className="text-sm text-red-300">
        {state.error}
      </p>
    );
  if (state.ok && state.message) return <p className="text-sm text-emerald-300">{state.message}</p>;
  return null;
}

export function StatusBadge({ status }: { status: "draft" | "published" | "archived" }) {
  const t = useT();
  const map = {
    draft: "bg-ui-hover text-ui-text-2",
    published: "bg-emerald-400/15 text-emerald-300",
    archived: "bg-ui-raised text-ui-text-3",
  } as const;
  const [label, cls] = [t.admin.status[status], map[status]];
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function AdultBadge({ adult }: { adult: boolean }) {
  return adult ? (
    <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300">18+</span>
  ) : (
    <span className="rounded-md bg-sky-400/10 px-2 py-0.5 text-xs font-semibold text-sky-300">SFW</span>
  );
}
