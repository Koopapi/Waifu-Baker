"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { OpeningStage } from "@/features/opening/OpeningStage";
import type { LabCard } from "@/features/opening/fakePack";
import { ackOpeningAction, openNextPackAction, resumeOpeningAction } from "@/app/sobres/actions";
import { useT } from "@/i18n/client";
import { LocaleToggle } from "@/i18n/LocaleToggle";

async function preload(cards: LabCard[]) {
  await Promise.all(
    cards.map(
      (c) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = c.image;
        }),
    ),
  );
}

/** Conecta la escena de apertura con los sobres reales del usuario. */
export function PackOpener({ setId, setCode, sealed, resumePackId }: { setId: string; setCode: string; sealed: number; resumePackId: string | null }) {
  const t = useT();
  const [remaining, setRemaining] = useState(sealed);
  const resume = useRef(resumePackId);
  const current = useRef<string | null>(null);

  const draw = useCallback(async () => {
    const pending = resume.current;
    resume.current = null;
    const r = pending ? await resumeOpeningAction(pending) : await openNextPackAction(setId);
    if (!r.ok) throw new Error(r.error);
    current.current = r.packId;
    if ("remaining" in r) setRemaining(r.remaining as number);
    await preload(r.cards);
    return r.cards;
  }, [setId]);

  const onFinished = useCallback(() => {
    if (current.current) void ackOpeningAction([current.current]);
  }, []);

  const nothingLeft = remaining === 0 && !resume.current;

  return (
    <>
      <OpeningStage
        draw={draw}
        packLabel={`BOOSTER · ${setCode}`}
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
            {nothingLeft && <span className="hud__chip">{t.packs.opener.nothingLeft}</span>}
          </>
        }
      />
      {/* La escena ocupa toda la pantalla y tapa la cabecera: selector de idioma en una esquina. */}
      <LocaleToggle className="fixed right-3 top-3 z-50" />
    </>
  );
}
