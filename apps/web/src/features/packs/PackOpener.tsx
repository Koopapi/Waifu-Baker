"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { LabCard } from "@/features/opening/fakePack";
import { liveImageUrls } from "@/domain/cards/live";
import type { PackArtData } from "@/features/packs/PackArt";
import { ackOpeningAction, openNextPackAction, resumeOpeningAction } from "@/app/sobres/actions";
import { useT } from "@/i18n/client";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import type { PackKind } from "@/domain/catalog/default-odds";
import { PackKindTag } from "./PackKindTag";

// Spec 013, RF-13: la escena (GSAP, gestos y partículas) se descarga aparte, después de pintar la página.
const OpeningStage = dynamic(() => import("@/features/opening/OpeningStage").then((m) => m.OpeningStage), {
  ssr: false,
  loading: () => <div aria-busy="true" data-testid="stage-loading" className="fixed inset-0 bg-[radial-gradient(120%_80%_at_50%_15%,#1d1236_0%,#0b0912_55%,#050408_100%)]" />,
});

/** Descarga las imágenes fijas y, para la carta viva (spec 018, RF-6), las capas de cada carta. */
async function preload(cards: LabCard[]) {
  const urls = cards.flatMap((c) => [c.image, ...(c.live ? liveImageUrls(c.live) : [])]);
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );
}

/** Conecta la escena de apertura con los sobres reales del usuario. */
export function PackOpener({ setId, setCode, setName, art, kind, sealed, resumePackId }: { setId: string; setCode: string; setName: string; art: PackArtData; kind: PackKind; sealed: number; resumePackId: string | null }) {
  const t = useT();
  const [remaining, setRemaining] = useState(sealed);
  const resume = useRef(resumePackId);
  const current = useRef<string | null>(null);

  const draw = useCallback(async () => {
    const pending = resume.current;
    resume.current = null;
    const r = pending ? await resumeOpeningAction(pending) : await openNextPackAction(setId, kind);
    if (!r.ok) throw new Error(r.error);
    current.current = r.packId;
    if ("remaining" in r) setRemaining(r.remaining as number);
    await preload(r.cards);
    return r.cards;
  }, [setId, kind]);

  const onFinished = useCallback(() => {
    if (current.current) void ackOpeningAction([current.current]);
  }, []);


  return (
    <>
      <OpeningStage
        draw={draw}
        // Spec 023: el sobre nuevo de su tipo; si había una apertura sin terminar, se retoma en el mazo (RF-22).
        shell={{ setId, code: setCode, name: setName, art, kind, kindLabel: t.common.packKind[kind] }}
        setLine={`${setCode} · ${setName}`}
        autoOpen={Boolean(resumePackId)}
        onFinished={onFinished}
        renderSummaryActions={(reset) => (
          <>
            {remaining > 0 && (
              <button type="button" className="hud__btn hud__btn--primary" onClick={reset} data-testid="open-another">
                {t.packs.opener.openAnother(remaining)}
              </button>
            )}
            <Link href="/sobres" className="hud__btn">
              {t.packs.opener.backToMine}
            </Link>
          </>
        )}
        extraHud={
          <>
            <Link href="/sobres" className="hud__btn">
              {t.packs.opener.backToMineHud}
            </Link>
            {/* Spec 022, RF-19: plata o gold, a la vista durante toda la apertura. */}
            <PackKindTag kind={kind} label={t.common.packKind[kind]} className="fixed left-3 top-3 z-50" />
          </>
        }
      />
      {/* La escena ocupa toda la pantalla y tapa la cabecera: selector de idioma en una esquina. */}
      <LocaleToggle className="fixed right-3 top-3 z-50" />
    </>
  );
}
