"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWelcomeSetAction } from "@/app/admin/sets/actions";
import { useT } from "@/i18n/client";
import type { ActionState } from "@/server/auth/admin-action";

/** Spec 001, RF-5: usar (o dejar de usar) esta colección para el sobre de bienvenida. */
export function WelcomeToggle({ setId, isWelcome, eligible }: { setId: string; isWelcome: boolean; eligible: boolean }) {
  const t = useT().admin.set.welcome;
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (make: boolean) =>
    start(async () => {
      const r = await setWelcomeSetAction(setId, make);
      setState(r);
      if (r.ok) router.refresh();
    });
  return (
    <div className="space-y-2" data-testid="welcome-toggle">
      {isWelcome ? (
        <>
          <p className="text-sm text-emerald-300">{t.isWelcome}</p>
          <button type="button" disabled={pending} onClick={() => run(false)} className="rounded-full border border-white/20 px-4 py-1.5 text-sm disabled:opacity-50">
            {t.remove}
          </button>
        </>
      ) : eligible ? (
        <button type="button" disabled={pending} onClick={() => run(true)} className="rounded-full bg-[#d6b370] px-4 py-1.5 text-sm font-semibold text-[#0b0c0e] disabled:opacity-50">
          {t.make}
        </button>
      ) : (
        <p className="text-sm text-white/50">{t.onlyPublishedSfw}</p>
      )}
      {state && <p className={`text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>{state.error ?? state.message}</p>}
    </div>
  );
}
