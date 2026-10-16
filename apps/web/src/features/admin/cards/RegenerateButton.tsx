"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateSetAction } from "@/app/admin/sets/card-actions";
import { Button } from "@/ui/action/Button";
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
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await regenerateSetAction(setId);
            setMsg(r.error ?? r.message ?? null);
            router.refresh();
          })
        }
      >
        {pending ? t.regenerating(count) : t.regenerate}
      </Button>
      {msg && <span className="text-xs text-ui-text-3">{msg}</span>}
    </span>
  );
}
