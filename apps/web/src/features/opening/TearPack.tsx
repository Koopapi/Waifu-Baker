"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { withoutParticles } from "@/domain/packs/design";
import type { PackViewData } from "@/domain/packs/view";
import { useT } from "@/i18n/client";
import { sound } from "@/features/sound/engine";
import { sobreTextos } from "@/features/packs/sobre-textos";
import { SobreCapas, type SobreCapasHandle } from "@/ui/game/sobre-capas/SobreCapas";
import type { SobreRegistro } from "@/ui/game/sobre-capas/sobre-capas";
import { cx } from "@/ui/variants";

interface Props {
  view: PackViewData;
  reducedMotion: boolean;
  muted: boolean;
  /** Spec 013, RF-2: dentro del gesto que abre el sobre (soltar, Intro o el botón), donde el navegador deja sonar. */
  onCommit: () => void;
  /** Spec 030, RF-18: el sobre se abrió; ahora se pide el contenido al servidor (spec 023, RF-10). */
  onOpen: () => void;
  /** Elemento que escucha el puntero para inclinar (la mesa entera). */
  zone: React.RefObject<HTMLElement | null>;
}

export interface TearPackHandle {
  ocultar(): Promise<void>;
  reiniciar(): void;
}

/**
 * Spec 030, RF-18: el sobre de Bruno (`sobre-capas.js`) en la mesa de apertura. Se rasga por la línea o se despega el
 * sticker según su diseño: la tira sale volando, hay un destello, el rasgado suena y vibra corto (por el motor de sonido,
 * con el silencio recordado de la spec 013). Un toque sin deslizar sacude la indicación. «Abrir sin deslizar» y la
 * tecla Intro hacen lo mismo (spec 023, RF-9); con movimiento reducido solo el botón y el teclado (RNF).
 */
export const TearPack = forwardRef<TearPackHandle, Props>(function TearPack({ view, reducedMotion, muted, onCommit, onOpen, zone }, ref) {
  const t = useT();
  const sobre = useRef<SobreCapasHandle>(null);
  const [phase, setPhase] = useState<"whole" | "off">("whole");
  const [shaking, setShaking] = useState(false);
  const textos = useMemo(() => sobreTextos(t.packs.sobre), [t]);
  // RNF movimiento reducido: sin partículas (el componente ya quita el balanceo, el flotar y el vuelo de la tira).
  const registro = useMemo(() => (reducedMotion ? withoutParticles(view.registro) : view.registro) as unknown as SobreRegistro, [view.registro, reducedMotion]);

  useImperativeHandle(ref, () => ({
    ocultar: () => sobre.current?.ocultar() ?? Promise.resolve(),
    reiniciar: () => {
      setPhase("whole");
      sobre.current?.reiniciar();
    },
  }), []);

  return (
    <div className="tear-wrap">
      <div
        className={cx("tear", `tear--${phase}`, shaking && "tear--shake", reducedMotion && "tear--reduced")}
        data-testid="tear-pack"
        data-kind={view.kind}
        data-designed={view.designed || undefined}
        data-apertura={view.registro.apertura}
        onAnimationEnd={(e) => e.target === e.currentTarget && setShaking(false)}
      >
        <SobreCapas
          ref={sobre}
          registro={registro}
          textos={textos}
          label={`${t.packs.sobre.pack} ${view.name} ${view.code} · ${t.common.packKind[view.kind]}`}
          inclinacion={reducedMotion ? 0 : 1}
          sonido={!muted}
          gestos={!reducedMotion}
          zone={zone}
          onOpen={() => {
            setPhase("off");
            onCommit();
            onOpen();
          }}
          onHint={() => setShaking(true)}
          onVibrate={(p) => sound.vibrate(p)}
          onSound={() => sound.note("tear")}
          className="tear__sobre"
        />
      </div>
      {/* Spec 023, RF-9: siempre a mano; con movimiento reducido es la forma de abrir (RNF). */}
      <button type="button" className="pack__cta tear__cta" onClick={() => sobre.current?.abrir()} disabled={phase !== "whole"} data-testid="open-without-swipe">
        {t.packs.stage.openWithoutSwipe}
      </button>
    </div>
  );
});
