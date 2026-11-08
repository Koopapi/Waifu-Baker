"use client";

import { useT } from "@/i18n/client";
import { AnimatedCounter } from "@/ui/game/AnimatedCounter";

/** Spec 015, RF-3: las galletas del pie de la barra lateral suben como un marcador y reciben los premios que vuelan. */
export function CookiesDetail({ cookies, dust = 0 }: { cookies: number; dust?: number }) {
  const t = useT().common.shell;
  return (
    <>
      <AnimatedCounter value={cookies} format={t.cookies} data-fly-target="cookies" />
      {/* Spec 029, RF-17: el polvo, solo si tiene (se gana reciclando). */}
      {dust > 0 && (
        <span className="block" data-testid="shell-dust">
          {t.dust(dust)}
        </span>
      )}
    </>
  );
}
