"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptTermsAction } from "@/app/bienvenida/actions";
import { useT } from "@/i18n/client";

export function GateForm({ next }: { next: string }) {
  const t = useT().legal.gate;
  const [state, action, pending] = useActionState(acceptTermsAction, null);
  return (
    <form action={action} className="space-y-4" data-testid="gate-form">
      <input type="hidden" name="next" value={next} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="age" required className="mt-1" />
        <span>{t.age}</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required className="mt-1" />
        <span>
          {t.termsBefore}{" "}
          <Link href="/legal/terms" target="_blank" className="underline">
            {t.termsLink}
          </Link>{" "}
          {t.and}{" "}
          <Link href="/legal/privacy" target="_blank" className="underline">
            {t.privacyLink}
          </Link>
          .
        </span>
      </label>
      <button disabled={pending} className="w-full rounded-full bg-[#d6b370] py-3 font-semibold text-[#0b0c0e] disabled:opacity-50">
        {t.submit}
      </button>
      {state?.error && <p className="text-sm text-red-300">{state.error}</p>}
    </form>
  );
}
