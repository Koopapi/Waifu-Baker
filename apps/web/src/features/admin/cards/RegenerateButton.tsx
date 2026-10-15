"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateSetAction } from "@/app/admin/sets/card-actions";
import { useT } from "@/i18n/client";

/** Vuelve a componer todas las cartas con el marco actual (tras actualizar los marcos de Pencil). */
export function RegenerateButton({ setId, count }: { setId: string; count: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const t = useT().admin.cards;
  if (count === 0) return null;
  return (
    <span className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await regenerateSetAction(setId);
            setMsg(r.error ?? r.message ?? null);
            router.refresh();
          })
        }
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-60"
      >
        {pending ? t.regenerating(count) : t.regenerate}
      </button>
      {msg && <span className="text-xs text-white/50">{msg}</span>}
    </span>
  );
}
