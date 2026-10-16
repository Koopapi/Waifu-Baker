"use client";

import { useRouter } from "next/navigation";
import { setWelcomeSetAction } from "@/app/admin/sets/actions";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { useOptimisticAction } from "@/ui/hooks/useOptimisticAction";

/**
 * Spec 001, RF-5: usar (o dejar de usar) esta colección para el sobre de bienvenida. Spec 011, RF-10 y RF-11:
 * el cambio se ve al instante y el aviso ofrece «Deshacer».
 */
export function WelcomeToggle({ setId, isWelcome, eligible }: { setId: string; isWelcome: boolean; eligible: boolean }) {
  const t = useT().admin.set.welcome;
  const router = useRouter();
  const run = async (make: boolean) => {
    const r = await setWelcomeSetAction(setId, make);
    if (r.ok) router.refresh();
    return r;
  };
  const [welcome, toggle] = useOptimisticAction<boolean, boolean>({
    value: isWelcome,
    apply: (_, make) => make,
    run,
    undo: (make) => run(!make),
    successTitle: t.made,
  });
  return (
    <div className="space-y-2" data-testid="welcome-toggle">
      {welcome ? (
        <>
          <p className="text-sm text-ui-success-text">{t.isWelcome}</p>
          <Button size="sm" variant="secondary" onClick={() => toggle(false)}>
            {t.remove}
          </Button>
        </>
      ) : eligible ? (
        <Button size="sm" onClick={() => toggle(true)}>
          {t.make}
        </Button>
      ) : (
        <p className="text-sm text-ui-text-3">{t.onlyPublishedSfw}</p>
      )}
    </div>
  );
}
