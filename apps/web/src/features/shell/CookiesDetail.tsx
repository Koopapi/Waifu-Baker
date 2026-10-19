"use client";

import { useT } from "@/i18n/client";
import { AnimatedCounter } from "@/ui/game/AnimatedCounter";

/** Spec 015, RF-3: las galletas del pie de la barra lateral suben como un marcador y reciben los premios que vuelan. */
export function CookiesDetail({ cookies }: { cookies: number }) {
  const t = useT().common.shell;
  return <AnimatedCounter value={cookies} format={t.cookies} data-fly-target="cookies" />;
}
