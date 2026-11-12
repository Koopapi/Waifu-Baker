"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SampleCard } from "@/domain/packs/designer-samples";
import { rarityTier } from "@/domain/catalog/rarity-tier";
import type { PackRegistro } from "@/domain/packs/design";
import { SOBRE_TIMELINE } from "@/domain/opening/sobre";
import { useT } from "@/i18n/client";
import { useAdminPacksT } from "@/i18n/admin-packs";
import { sobreTextos } from "@/features/packs/sobre-textos";
import { Button } from "@/ui/action/Button";
import { CartaCapas, type CartaCapasHandle } from "@/ui/game/CartaCapas";
import { PreviewStage } from "@/ui/game/PreviewStage";
import { SobreCapas, type SobreCapasHandle } from "@/ui/game/sobre-capas/SobreCapas";
import type { SobreRegistro } from "@/ui/game/sobre-capas/sobre-capas";
import { cx } from "@/ui/variants";

export type { SampleCard };

export type Scene = "rayos" | "oscuro" | "claro";

type TestPhase = "closed" | "opening" | "revealing" | "done";

/**
 * Spec 030, RF-3: la vista previa en vivo del creador del paquete de diseño: el sobre se inclina con el puntero, se puede rasgar o
 * despegar, y «Probar apertura» lo abre con cartas de muestra (suben a los 0,38 s, el sobre se va a los 1,25 s y la
 * primera sale a los 1,9 s); «Siguiente carta» las pasa y «Volver a cerrar» vuelve al sobre cerrado.
 */
export function DesignerStage({
  registro,
  samples,
  inclinacion,
  reposo,
  sonido,
  guias,
  scene,
  hint,
  warn,
}: {
  registro: PackRegistro;
  samples: SampleCard[];
  inclinacion: number;
  reposo: boolean;
  sonido: boolean;
  guias: boolean;
  scene: Scene;
  hint: string;
  warn: boolean;
}) {
  const t = useAdminPacksT();
  const tt = useT();
  const zone = useRef<HTMLDivElement>(null);
  const sobre = useRef<SobreCapasHandle>(null);
  const top = useRef<CartaCapasHandle>(null);
  const [phase, setPhase] = useState<TestPhase>("closed");
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<"hidden" | "inside" | "rise" | "center">("hidden");
  const [shake, setShake] = useState(false);
  const timers = useRef<number[]>([]);
  const textos = useMemo(() => sobreTextos(tt.packs.sobre), [tt]);
  const count = Math.max(1, Math.min(15, registro.cartas || 1));
  const deck = useMemo(() => Array.from({ length: count }, (_, i) => samples[i % Math.max(1, samples.length)]).filter(Boolean), [count, samples]);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.current.forEach((x) => window.clearTimeout(x));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const onOpen = useCallback(() => {
    if (phase !== "closed") return;
    setPhase("opening");
    setIndex(0);
    setStep("inside");
    later(SOBRE_TIMELINE.rise, () => setStep("rise"));
    later(SOBRE_TIMELINE.hide, () => {
      void sobre.current?.ocultar();
      setStep("center");
    });
    later(SOBRE_TIMELINE.ready, () => setPhase("revealing"));
  }, [phase]);

  useEffect(() => {
    if (phase !== "revealing") return;
    // Spec 039, RF-13: la carta viva hace su entrada cuando sus capas terminan de cargar.
    if (deck[index]?.live) top.current?.entrarAlCargar();
    else top.current?.entrar();
  }, [phase, index]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    if (phase !== "revealing") return;
    if (index + 1 >= deck.length) return setPhase("done");
    setIndex(index + 1);
  };
  const close = () => {
    clear();
    setPhase("closed");
    setIndex(0);
    setStep("hidden");
    sobre.current?.reiniciar();
  };

  // Un cambio del diseño vuelve a dibujar el sobre cerrado (como el creador).
  const json = JSON.stringify(registro);
  const last = useRef(json);
  useEffect(() => {
    if (last.current === json) return;
    last.current = json;
    clear();
    setPhase("closed");
    setStep("hidden");
  }, [json]);

  const indication = phase === "closed" ? (registro.apertura === "sticker" ? tt.packs.sobre.sticker.hint : tt.packs.sobre.tear.hint) : phase === "opening" ? t.opened : phase === "done" ? t.done : t.cardLine(deck[index]?.name ?? "", tt.common.rarity[deck[index]?.rarity ?? "common"], index + 1, deck.length);

  return (
    <div className="space-y-3">
      <PreviewStage ref={zone} className={cx("pack-designer__stage min-h-[560px] px-4", focusless)} data-scene={scene} aria-label={t.previewLabel} data-testid="pack-preview">
        <div className="flex flex-col items-center gap-4">
          <p className={cx("pack-designer__pill", shake && "pack-designer__pill--shake")} aria-live="polite" data-testid="pack-indication" onAnimationEnd={() => setShake(false)}>
            {indication}
          </p>
          <div className="pack-designer__zone">
            <div className="pack-designer__deck" data-step={step} aria-hidden={phase === "closed"} onClick={next}>
              {deck.map((c, i) => (
                <div key={i} className="pack-designer__card" style={{ zIndex: 20 - i, visibility: step !== "hidden" && i === index && phase !== "done" ? "visible" : "hidden" }}>
                  {/* Spec 039, RF-13 y RF-14: la carta a la vista, viva como en la apertura real; las demás, fijas. */}
                  {c.live && i === index ? (
                    <CartaCapas ref={top} tier={c.live.tier} image="" config={c.live.config} label={c.name} sealHidden className="w-full" />
                  ) : (
                    <CartaCapas ref={i === index ? top : undefined} tier={rarityTier(c.rarity)} image={c.image} rawArt={c.raw} label={c.name} sealHidden className="w-full" />
                  )}
                </div>
              ))}
            </div>
            <SobreCapas
              ref={sobre}
              registro={registro as unknown as SobreRegistro}
              textos={textos}
              inclinacion={inclinacion}
              reposo={reposo}
              sonido={sonido}
              guias={guias}
              zone={zone}
              onOpen={onOpen}
              onHint={() => setShake(true)}
              className={cx("pack-designer__host", phase !== "closed" && phase !== "opening" && "pointer-events-none")}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {phase === "closed" && (
              <Button size="sm" onClick={() => sobre.current?.abrir()} data-testid="pack-test">
                {t.test}
              </Button>
            )}
            {phase === "revealing" && (
              <Button size="sm" variant="secondary" onClick={next} data-testid="pack-test-next">
                {t.next}
              </Button>
            )}
            {phase !== "closed" && (
              <Button size="sm" variant="secondary" onClick={close} data-testid="pack-test-close">
                {t.close}
              </Button>
            )}
          </div>
        </div>
      </PreviewStage>
      <p className={cx("text-xs", warn ? "text-ui-warning-text" : "text-ui-text-3")} data-testid="pack-stage-hint">
        {hint}
      </p>
    </div>
  );
}

const focusless = "outline-none";
