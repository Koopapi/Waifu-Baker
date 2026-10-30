"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OpeningStage } from "@/features/opening/OpeningStage";
import { simulatePackAction } from "@/app/admin/sets/card-actions";
import { useT } from "@/i18n/client";
import type { PackKind } from "@/domain/catalog/default-odds";
import type { PackArtData } from "@/features/packs/PackArt";

/** Envuelve la escena de apertura con el sorteo real de la colección (sin guardar nada). */
/** Spec 023, RF-21: la misma apertura que ve el coleccionista, con el sobre del tipo elegido. */
export function SimulateStage({ setId, kind, label, code, name, art }: { setId: string; kind: PackKind; label: string; code: string; name: string; art: PackArtData }) {
  const kindLabel = useT().common.packKind[kind];
  const t = useT().admin.simulate;
  const failed = t.failed;
  const draw = useCallback(async () => {
    const r = await simulatePackAction(setId, kind);
    if (!r.ok || !r.cards) throw new Error(r.error ?? failed);
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
  }, [setId, kind, failed]);

  // La apertura ocupa la pantalla entera, por encima de la estructura del panel (modo foco): se monta en
  // <body> para no depender de los contenedores de la estructura.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden bg-ui-rail" data-theme="kawaii" data-testid="simulate-focus">
      <OpeningStage
        draw={draw}
        shell={{ setId, code, name, art, kind, kindLabel }}
        setLine={label}
        extraHud={
          <Link href={`/admin/sets/${setId}`} className="hud__btn">
            {t.back}
          </Link>
        }
      />
    </div>,
    document.body,
  );
}
