"use client";

import { useEffect, useState } from "react";
import type { OpenAllCard } from "@/app/packs/actions";
import { confettiCount, revealSound, vibrationPattern } from "@/domain/opening/feedback";
import { sound } from "@/features/sound/engine";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { CartaCapas } from "@/ui/game/CartaCapas";
import { Confetti, type ConfettiBurst } from "@/ui/game/Confetti";

/**
 * Spec 019, RF-4 a RF-9 y RF-14: las destacadas del lote, una por una y en grande. Cada una viva (o, con movimiento
 * reducido, su imagen fija) con el sonido, la vibración y la celebración de su rareza. Se pasa tocando la carta o con
 * «Siguiente»; «Saltar» lleva al resumen.
 */
export function OpenAllFocus({ items, reduced, onDone }: { items: OpenAllCard[]; reduced: boolean; onDone: () => void }) {
  const tt = useT();
  const t = tt.packs.openAll;
  const [i, setI] = useState(0);
  const [burst, setBurst] = useState<ConfettiBurst | null>(null);
  const c = items[i];

  useEffect(() => {
    const extra = revealSound(c.rarity);
    if (extra) sound.play(extra);
    sound.vibrate(vibrationPattern(c.rarity));
    if (!reduced && confettiCount(c.rarity) > 0) setBurst({ key: Date.now(), count: confettiCount(c.rarity), x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [c, reduced]);

  const last = i + 1 >= items.length;
  const next = () => (last ? onDone() : setI(i + 1));
  const live = !reduced && c.live;

  return (
    <section className="oa-focus" data-testid="open-all-focus">
      <p className="oa-burst__counter" data-testid="focus-counter">
        {t.focusCounter(i + 1, items.length)}
      </p>
      <button type="button" className={`oa-focus__card rarity-${c.rarity}`} onClick={next} aria-label={`${c.name} · ${t.next}`} data-testid="focus-card">
        {live && c.live ? (
          <CartaCapas key={c.key} tier={c.live.tier} image="" config={c.live.config} holo={c.holo} label={c.name} entrance className="w-full" />
        ) : (
          <span key={c.key} className={`block overflow-hidden rounded-l ${c.holo ? "holo-finish" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
            <img src={c.image} alt="" className="block aspect-[700/991] w-full object-cover" draggable={false} />
          </span>
        )}
      </button>
      <p key={`r${c.key}`} className={`oa-focus__ribbon rarity-${c.rarity}`}>
        {tt.packs.stage.celebrate(tt.common.rarity[c.rarity])}
        {c.isNew ? ` · ${tt.packs.notes.isNew}` : ""}
        {c.holo ? tt.packs.openAll.holoSuffix : ""}
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onDone} data-testid="open-all-skip">
          {t.skip}
        </Button>
        <Button onClick={next} data-testid="focus-next">
          {last ? t.toSummary : `${t.next} ›`}
        </Button>
      </div>
      <p className="text-xs text-ui-text-3">{t.focusHint}</p>
      <Confetti burst={burst} />
    </section>
  );
}
