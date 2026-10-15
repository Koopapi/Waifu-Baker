"use client";

import Link from "next/link";
import { useCallback } from "react";
import { OpeningStage } from "@/features/opening/OpeningStage";
import { simulatePackAction } from "@/app/admin/sets/card-actions";

/** Envuelve la escena de apertura con el sorteo real de la colección (sin guardar nada). */
export function SimulateStage({ setId, label }: { setId: string; label: string }) {
  const draw = useCallback(async () => {
    const r = await simulatePackAction(setId);
    if (!r.ok || !r.cards) throw new Error(r.error ?? "No se pudo simular el sobre.");
    // Precarga para que el volteo no muestre la imagen a medio cargar.
    await Promise.all(
      r.cards.map(
        (c) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = c.image;
          }),
      ),
    );
    return r.cards;
  }, [setId]);

  return (
    <OpeningStage
      draw={draw}
      packLabel={label}
      extraHud={
        <Link href={`/admin/sets/${setId}`} className="hud__btn">
          ← Volver a la colección
        </Link>
      }
    />
  );
}
