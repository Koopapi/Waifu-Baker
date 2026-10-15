"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { ActionState } from "@/server/auth/admin-action";

export const inputCls =
  "w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#d6b370] disabled:opacity-50";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wider text-white/60">{label}</span>
      {children}
      {hint && <span className="block text-xs text-white/40">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ children, variant = "primary" }: { children: ReactNode; variant?: "primary" | "danger" | "ghost" }) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "bg-[#d6b370] text-[#0b0c0e] font-semibold"
      : variant === "danger"
        ? "border border-red-400/40 text-red-300 hover:bg-red-400/10"
        : "border border-white/15 text-white/80 hover:bg-white/5";
  return (
    <button disabled={pending} className={`rounded-full px-4 py-2 text-sm disabled:opacity-60 ${cls}`}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState | null }) {
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
  const map = {
    draft: ["Borrador", "bg-white/10 text-white/80"],
    published: ["Publicada", "bg-emerald-400/15 text-emerald-300"],
    archived: ["Archivada", "bg-white/5 text-white/40"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

export function AdultBadge({ adult }: { adult: boolean }) {
  return adult ? (
    <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300">18+</span>
  ) : (
    <span className="rounded-md bg-sky-400/10 px-2 py-0.5 text-xs font-semibold text-sky-300">SFW</span>
  );
}
