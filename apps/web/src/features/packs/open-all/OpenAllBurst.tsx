"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OpenAllCard } from "@/app/sobres/actions";
import { burstPlan, throttleSounds } from "@/domain/opening/open-all";
import { sound } from "@/features/sound/engine";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";

const SOUND_GAP_MS = 120;
const VISIBLE_PACKS = 4;

/**
 * Spec 019, RF-1 a RF-3 y RF-9: los sobres se rasgan uno tras otro (sin pasar de 6 s) y las cartas de cada uno caen a
 * su sitio; suena como mucho un rasgado cada 120 ms. «Saltar» lleva al resumen.
 */
export function OpenAllBurst({ packs, cards, pack, onDone, onSkip }: { packs: number; cards: OpenAllCard[]; pack: React.ReactNode; onDone: () => void; onSkip: () => void }) {
  const t = useT().packs.openAll;
  const [torn, setTorn] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  const { interval } = burstPlan(packs);
  // RF-3: qué rasgados suenan, calculado de antemano con el mismo ritmo.
  const audible = useMemo(() => new Set(throttleSounds(Array.from({ length: packs }, (_, i) => i * interval), SOUND_GAP_MS)), [packs, interval]);

  useEffect(() => {
    let n = 0;
    const tick = () => {
      if (audible.has(n * interval)) sound.play("tear");
      n += 1;
      setTorn(n);
      if (n >= packs) {
        window.clearInterval(id);
        window.setTimeout(() => done.current(), 450);
      }
    };
    const id = window.setInterval(tick, interval);
    tick();
    return () => window.clearInterval(id);
  }, [packs, interval, audible]);

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
            {pack}
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
