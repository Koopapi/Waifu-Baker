"use client";

import { useRouter } from "next/navigation";
import { setFreeSetAction } from "@/app/admin/sets/actions";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { useOptimisticAction } from "@/ui/hooks/useOptimisticAction";

/** Spec 021, RF-1 a RF-3: gratuita (sale en las fuentes gratis) o de Patreon; una 18+ no puede ser gratuita. */
export function FreeToggle({ setId, isFree, isAdult }: { setId: string; isFree: boolean; isAdult: boolean }) {
  const t = useT().admin.set.free;
  const router = useRouter();
  const run = async (make: boolean) => {
    const r = await setFreeSetAction(setId, make);
    if (r.ok) router.refresh();
    return r;
  };
  const [free, toggle] = useOptimisticAction<boolean, boolean>({
    value: isFree,
    apply: (_, make) => make,
    run,
    undo: (make) => run(!make),
    successTitle: t.made,
  });
  return (
    <div className="space-y-2" data-testid="free-toggle">
      <p className="text-sm text-ui-text-2">{free ? t.isFree : t.isPatreon}</p>
      {isAdult ? (
        <p className="text-sm text-ui-text-3">{t.adultNo}</p>
      ) : free ? (
        <Button size="sm" variant="secondary" onClick={() => toggle(false)}>
          {t.remove}
        </Button>
      ) : (
        <Button size="sm" onClick={() => toggle(true)}>
          {t.make}
        </Button>
      )}
    </div>
  );
}
