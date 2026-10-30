"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenAllCard } from "@/app/packs/actions";
import { BURST_END_MS, burstPlan, soundGate } from "@/domain/opening/open-all";
import { sound } from "@/features/sound/engine";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";

const SOUND_GAP_MS = 120;
const VISIBLE_PACKS = 4;

/**
 * Spec 019, RF-1 a RF-3 y RF-9: los sobres se rasgan uno tras otro (sin pasar de 6 s) y las cartas de cada uno caen a
 * su sitio; suena como mucho un rasgado cada 120 ms. «Saltar» lleva al resumen.
 */
export function OpenAllBurst({
  packs,
  cards,
  pack,
  tornPack = pack,
  onDone,
  onSkip,
}: {
  packs: number;
  cards: OpenAllCard[];
  pack: React.ReactNode;
  /** Spec 023, RF-20: el sobre rasgándose (su tira sale volando). */
  tornPack?: React.ReactNode;
  onDone: () => void;
  onSkip: () => void;
}) {
  const t = useT().packs.openAll;
  const [torn, setTorn] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  const { interval } = burstPlan(packs);
  // El inicio, el avance y la puerta del sonido viven fuera del efecto: si React lo vuelve a montar (modo estricto en
  // desarrollo), la ráfaga sigue donde iba en vez de empezar otra vez.
  const start = useRef<number | null>(null);
  const step = useRef(0);
  const gate = useRef(soundGate(SOUND_GAP_MS));

  useEffect(() => {
    start.current ??= performance.now();
    let raf = 0;
    let end = 0;
    // El avance sale del tiempo transcurrido (no de contar ticks): aunque el navegador vaya cargado, no se retrasa.
    const frame = (now: number) => {
      const due = Math.min(packs, Math.floor((now - start.current!) / interval) + 1);
      if (due > step.current) {
        // RF-3: como mucho un rasgado cada 120 ms, medido en tiempo real.
        if (gate.current(now)) sound.play("tear");
        step.current = due;
        setTorn(due);
      }
      if (step.current >= packs) end = window.setTimeout(() => done.current(), BURST_END_MS);
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(end);
    };
  }, [packs, interval]);

  const falling = cards.filter((c) => c.pack === torn - 1);
  const left = Math.max(0, packs - torn);
  return (
    <section className="oa-burst" data-testid="open-all-burst" aria-live="polite">
      <p className="oa-burst__counter" data-testid="burst-counter">
        {t.burstCounter(Math.min(torn, packs), packs)}
      </p>
      <div className="oa-burst__stack" aria-hidden>
        {Array.from({ length: Math.min(VISIBLE_PACKS, left) }, (_, i) => (
          <div key={i} className="oa-burst__pack" style={{ "--i": i } as React.CSSProperties}>
            {pack}
          </div>
        ))}
        {/* El sobre recién rasgado sale volando (una clave nueva por sobre reinicia la animación). */}
        {torn > 0 && (
          <div key={`t${torn}`} className="oa-burst__pack oa-burst__pack--torn">
            {tornPack}
          </div>
        )}
      </div>
      <ul key={`c${torn}`} className="oa-burst__falling" aria-hidden>
        {falling.map((c, i) => (
          <li key={c.key} className={`oa-burst__card rarity-${c.rarity}`} style={{ "--i": i } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
            <img src={c.image} alt="" draggable={false} />
          </li>
        ))}
      </ul>
      <Button variant="secondary" onClick={onSkip} data-testid="open-all-skip">
        {t.skip} ⏭
      </Button>
    </section>
  );
}
