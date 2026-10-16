"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptTermsAction } from "@/app/bienvenida/actions";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { Checkbox } from "@/ui/form/Choice";
import { useT } from "@/i18n/client";

export function GateForm({ next, minAge }: { next: string; minAge: number }) {
  const t = useT().legal.gate;
  const [state, action, pending] = useActionState(acceptTermsAction, null);
  return (
    <form action={action} className="space-y-4" data-testid="gate-form">
      <input type="hidden" name="next" value={next} />
      <Checkbox name="age" required label={t.age(minAge)} />
      <Checkbox
        name="terms"
        required
        label={
          <>
            {t.termsBefore}{" "}
            <Link href="/legal/terms" target="_blank" className="text-ui-accent-text underline">
              {t.termsLink}
            </Link>{" "}
            {t.and}{" "}
            <Link href="/legal/privacy" target="_blank" className="text-ui-accent-text underline">
              {t.privacyLink}
            </Link>
            .
          </>
        }
      />
      <Button type="submit" size="lg" width="full" loading={pending}>
        {t.submit}
      </Button>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
    </form>
  );
}
