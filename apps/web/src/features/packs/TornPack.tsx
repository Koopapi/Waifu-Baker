"use client";

import { PackThumb, type PackThumbProps } from "@/ui/game/sobre-capas/PackThumb";

/**
 * Spec 030, RF-25: el sobre de la ráfaga de «Abrir todos» rasgándose: la misma miniatura partida por la línea de
 * rasgado, con la tira que sale volando como en el sobre del paquete de diseño (solo transform y opacity: mismo ritmo de siempre).
 */
export function TornPack(props: Omit<PackThumbProps, "className" | "data">) {
  return (
    <div className="oa-torn">
      <PackThumb {...props} className="oa-torn__body w-full" />
      <PackThumb {...props} label="" className="oa-torn__strip w-full" />
    </div>
  );
}
