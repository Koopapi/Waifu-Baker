"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { openAllPacksAction, type OpenAllCard } from "@/app/packs/actions";
import { highlights } from "@/domain/opening/open-all";
import { sound, useSoundMuted } from "@/features/sound/engine";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { SoundToggle } from "@/ui/game/SoundToggle";
import { useReducedMotion } from "@/ui/hooks/useReducedMotion";
import { OpenAllBurst } from "./open-all/OpenAllBurst";
import { OpenAllFocus } from "./open-all/OpenAllFocus";
import { OpenAllSummary } from "./open-all/OpenAllSummary";
import type { PackArtData } from "./PackArt";
import { PackShell } from "./PackShell";
import { PackKindTag } from "./PackKindTag";
import type { PackKind } from "@/domain/catalog/default-odds";
import "./open-all.css";

type Phase = "idle" | "burst" | "focus" | "summary";

/**
 * Spec 004, RF-18: abre todos los sobres de la colección. Spec 019: los sobres se abren en el servidor y después se
 * anima el lote: ráfaga de sobres, foco en las destacadas y resumen agrupado por rareza («Saltar» lleva al resumen).
 */
export function OpenAllView({ setId, setCode, setName, art, kind, sealed }: { setId: string; setCode: string; setName: string; art: PackArtData; kind: PackKind; sealed: number }) {
  const [cards, setCards] = useState<OpenAllCard[] | null>(null);
  const [opened, setOpened] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const reduced = useReducedMotion();
  const t = useT();
  const muted = useSoundMuted();
  useEffect(() => {
    void sound.preload();
  }, []);

  const featured = useMemo(() => highlights(cards ?? []), [cards]);
  const afterBurst = () => setPhase(featured.length > 0 ? "focus" : "summary");

  const openAll = () => {
    // El clic es el gesto que habilita el audio (spec 013, RF-2).
    sound.unlock();
    start(async () => {
      setError(null);
      const r = await openAllPacksAction(setId, kind);
      if (!r.ok) return setError(r.error);
      setOpened(r.packs);
      setCards(r.cards);
      // RF-14: con movimiento reducido, sin ráfaga (RF-8: sin destacadas, directo al resumen).
      setPhase(reduced ? (highlights(r.cards).length > 0 ? "focus" : "summary") : "burst");
    });
  };

  // Spec 023, RF-5 y RF-20: el sobre nuevo de su tipo; en la ráfaga, el rasgado arranca su tira.
  const shell = { setId, code: setCode, name: setName, art, kind, kindLabel: t.common.packKind[kind] };
  const pack = <PackShell {...shell} className="w-full" />;
  const tornPack = <PackShell {...shell} state="torn" className="w-full" />;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6" data-phase={phase}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          {/* Spec 014, RF-8: el mismo sobre de la colección. */}
          {phase === "idle" && <PackShell {...shell} className="w-[96px] sm:w-[120px]" />}
          <div>
            <Link href="/packs" className="text-sm text-ui-text-3 hover:text-ui-text">
              {t.packs.openAll.backToMine}
            </Link>
            <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl font-semibold">
              {t.packs.openAll.title(setName)}
              {/* Spec 022, RF-19. */}
              <PackKindTag kind={kind} label={t.common.packKind[kind]} />
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SoundToggle muted={muted} onToggle={(m) => sound.setMuted(m)} variant="ghost" data-testid="sound-toggle" />
          {phase === "idle" && (
            <Button size="lg" onClick={openAll} loading={pending} disabled={sealed === 0} data-testid="open-all">
              {pending ? t.packs.openAll.opening : sealed === 0 ? t.packs.openAll.noneLeft : t.packs.openAll.openN(sealed)}
            </Button>
          )}
        </div>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      {cards && phase === "burst" && <OpenAllBurst packs={opened} cards={cards} pack={pack} tornPack={tornPack} onDone={afterBurst} onSkip={() => setPhase("summary")} />}
      {cards && phase === "focus" && <OpenAllFocus items={featured} reduced={reduced} onDone={() => setPhase("summary")} />}
      {cards && phase === "summary" && (
        <>
          <OpenAllSummary packs={opened} cards={cards} />
          <Button variant="secondary" asChild>
            <Link href="/packs">{t.packs.openAll.backToMineButton}</Link>
          </Button>
        </>
      )}
    </main>
  );
}
