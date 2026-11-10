"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useT } from "@/i18n/client";
import { drawFakePack, type LabCard, type Rarity } from "./fakePack";
import { TearPack, type TearPackHandle } from "./TearPack";
import { bell, whoosh } from "./sobre-sounds";
import { Card3D } from "./Card3D";
import { Particles, type ParticlesHandle } from "./Particles";
import { useTiltSource } from "./useTiltSource";
import { SWIPE_MIN, revealOrder, swipeSide } from "@/domain/opening/deck";
import { isSpecial, omen, progressDots, revealFx, sobreTimeline } from "@/domain/opening/sobre";
import { RARITY_SEAL } from "@/domain/catalog/rarity-tier";
import { basicRegistro } from "@/domain/packs/design";
import type { PackViewData } from "@/domain/packs/view";
import { Confetti, type ConfettiBurst } from "@/ui/game/Confetti";
import { Sticker } from "@/ui/icons/Sticker";
import { SoundToggle } from "@/ui/game/SoundToggle";
import { sound, useSoundMuted } from "@/features/sound/engine";
import { useReducedMotion } from "@/ui/hooks/useReducedMotion";
import "./opening.css";

/**
 * idle: sobre cerrado · opening: el sobre se abrió, se espera al servidor y las cartas suben (spec 030, RF-19) ·
 * deck: el mazo · summary: el resumen.
 */
type Phase = "idle" | "opening" | "deck" | "summary";
/** Spec 030, RF-19: dónde está el mazo mientras se abre (dentro del sobre, subiendo o ya en el centro). */
type Step = "inside" | "rise" | "center";
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, Math.max(0, ms)));

/** Spec 014, RF-9: destellos del fondo (posición en %, tamaño, color y retardo). */
const SPARKLES: [number, number, number, string, number][] = [
  [10, 14, 10, "#ffe27a", 0], [84, 19, 14, "#ff9ecb", 0.6], [15, 74, 12, "#7ef0c9", 1.1], [82, 66, 10, "#ffffff", 0.3],
  [51, 11, 8, "#7cc8ff", 1.6], [90, 83, 12, "#b79cff", 0.9], [7, 45, 8, "#ffffff", 1.9], [91, 39, 9, "#ffe27a", 0.4],
  [30, 88, 9, "#ff9ecb", 1.3], [64, 92, 8, "#7ef0c9", 0.2], [25, 28, 6, "#ffffff", 2.1], [72, 30, 6, "#ffffff", 1.4],
];
/** El sobre del laboratorio (sin colección real): el básico, sin arte. */
const LAB_VIEW: PackViewData = {
  setId: "lab",
  kind: "silver",
  code: "LAB",
  name: "Laboratorio",
  registro: basicRegistro("silver", { nombre: "Laboratorio", codigo: "LAB", cartas: 5 }, null),
  thumb: null,
  designed: false,
};

interface StageProps {
  /** Fuente de cartas del sobre. Por defecto, datos falsos del laboratorio. */
  draw?: () => Promise<LabCard[]>;
  /** Spec 030: el sobre de la colección y tipo (su diseño o el básico). */
  view?: PackViewData;
  /** Línea bajo el nombre al revelar (p. ej. «FA01 · Fan Art Vol. 1»). */
  setLine?: string;
  /** RF-22: la apertura ya estaba rasgada; se retoma en el mazo sin pedir rasgar. */
  autoOpen?: boolean;
  /** Contenido extra en la barra inferior (p. ej. «Volver al panel»). */
  extraHud?: React.ReactNode;
  /** Se llama una vez cuando se han apartado todas las cartas del sobre. */
  onFinished?: (cards: LabCard[]) => void;
  /** Sustituye el botón «Abrir otro sobre» del resumen. Recibe la función para reiniciar. */
  renderSummaryActions?: (reset: () => void) => React.ReactNode;
  /** Muestra el modo de inclinación (solo en el laboratorio). */
  debug?: boolean;
}

/**
 * Spec 023: el sobre se rasga de verdad y las cartas salen como un mazo, de menor a mayor rareza (RF-12, RF-13). La de
 * arriba se revela con un toque o deslizando (RF-15) y se presenta como en la referencia del paquete de diseño («¡Nueva!», insignia de
 * rareza, nombre y colección); otro gesto la aparta hacia ese lado (RF-16) y, tras la última, el resumen (RF-18).
 */
export function OpeningStage({ draw, view = LAB_VIEW, setLine, autoOpen = false, extraHud, onFinished, renderSummaryActions, debug = false }: StageProps = {}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>(autoOpen ? "opening" : "idle");
  const [step, setStep] = useState<Step>("inside");
  // Spec 030, RF-22: la carta especial presentada (rayos y estrella con su rareza).
  const [special, setSpecial] = useState<Rarity | null>(null);
  const [cards, setCards] = useState<LabCard[]>([]);
  /** La carta de arriba del mazo. */
  const [top, setTop] = useState(0);
  /** La de arriba ya está volteada y presentada. */
  const [shown, setShown] = useState(false);
  const [packKey, setPackKey] = useState(0);
  const [flash, setFlash] = useState<Rarity | null>(null);
  // Spec 018, RF-6: la carta presentada se ve viva.
  const [liveIndex, setLiveIndex] = useState<number | null>(null);
  // Spec 014, RF-13: confeti y celebración al revelar una rara o mejor.
  const [burst, setBurst] = useState<ConfettiBurst | null>(null);
  const [party, setParty] = useState<Rarity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const reduced = useReducedMotion();
  const tilt = useTiltSource();
  const stage = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const particles = useRef<ParticlesHandle>(null);
  const tear = useRef<TearPackHandle>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const muted = useSoundMuted();
  // Spec 013, RF-6: los sonidos se descargan al entrar en la apertura, sin retrasar la animación.
  useEffect(() => {
    void sound.preload();
  }, []);
  // El rasgado lo suena el sobre del paquete de diseño (sintetizado); aquí se desbloquea el audio de los volteos (spec 013, RF-2).
  const onCommit = useCallback(() => {
    sound.unlock();
  }, []);

  // RF-10 y RF-11: el contenido se pide al abrir el sobre; si falla, el sobre vuelve cerrado y se puede reintentar.
  // Spec 030, RF-19: mientras, la coreografía del paquete de diseño: las cartas suben boca abajo desde dentro a los 0,38 s, el sobre
  // se va a los 1,25 s y el mazo queda en el centro a los 1,9 s (si el servidor tarda más, cada paso espera a las cartas).
  const open = useCallback(
    (resume = false) => {
      setPhase("opening");
      setStep("inside");
      const tl = sobreTimeline(reduced || resume);
      const t0 = performance.now();
      void (async () => {
        try {
          const next = draw ? await draw() : drawFakePack();
          if (!alive.current) return;
          cardEls.current = [];
          setCards(revealOrder(next));
          setTop(0);
          setShown(false);
          await wait(tl.rise - (performance.now() - t0));
          if (!alive.current) return;
          if (!resume) {
            setStep("rise");
            whoosh();
          }
          await wait(tl.hide - tl.rise);
          if (!alive.current) return;
          void tear.current?.ocultar();
          setStep("center");
          await wait(tl.ready - tl.hide);
          if (alive.current) setPhase("deck");
        } catch (e) {
          if (!alive.current) return;
          // Cadena vacía = error sin mensaje: se muestra el texto genérico en el idioma activo.
          setError(e instanceof Error ? e.message : "");
          setPhase("idle");
          setPackKey((k) => k + 1);
        }
      })();
    },
    [draw, reduced],
  );

  // RF-22: retomar sin rasgar.
  const resumed = useRef(false);
  useEffect(() => {
    if (!autoOpen || resumed.current) return;
    resumed.current = true;
    open(true);
  }, [autoOpen, open]);

  /** Spec 030, RF-20: las cartas del mazo van derechas, una encima de otra (solo se ve la de arriba). */
  const deckPose = useCallback(() => ({ x: 0, y: 0, rotation: 0, scale: 1 }), []);

  // RF-12 (spec 030, RF-19): las cartas nacen boca abajo, apiladas dentro del sobre, antes de pintarse.
  useLayoutEffect(() => {
    const els = cardEls.current.slice(0, cards.length).filter((e): e is HTMLDivElement => Boolean(e));
    if (els.length === 0) return;
    gsap.set(
      els.map((el) => el.querySelector(".card3d__inner")),
      { rotationY: 180 },
    );
    gsap.set(els, { ...deckPose(), opacity: 1 });
  }, [cards, deckPose]);

  /** RF-14 y RF-15: voltea la de arriba con los efectos de su rareza y la presenta. */
  const reveal = useCallback(() => {
    if (busy.current) return;
    const i = top;
    const el = cardEls.current[i];
    const inner = el?.querySelector<HTMLElement>(".card3d__inner");
    const card = cards[i];
    if (!el || !inner || !card) return;
    busy.current = true;
    sound.play("flip");
    const effects = () => {
      // Spec 013, RF-4 y RF-9: las raras o mejores suenan y vibran según su nivel. Spec 030, RF-26: la Legendaria y la
      // EX, solo con el efecto del paquete de diseño (sin sonido de rareza, confeti, partículas, celebración ni destello).
      const fx = revealFx(card.rarity);
      if (fx.sound) sound.play(fx.sound);
      sound.vibrate(fx.vibration ? [...fx.vibration] : null);
      const r = el.getBoundingClientRect();
      if (fx.particles) particles.current?.burst(r.left + r.width / 2, r.top + r.height / 2, card.rarity);
      if (!reduced && fx.confetti > 0) setBurst({ key: Date.now(), count: fx.confetti, x: r.left + r.width / 2, y: r.top + r.height / 2 });
      if (!reduced && fx.celebrate) {
        setParty(card.rarity);
        window.setTimeout(() => setParty(null), 1600);
      }
      if (fx.flash && !reduced) {
        setFlash(card.rarity);
        window.setTimeout(() => setFlash(null), 400);
      }
      // Spec 030, RF-22: la Legendaria y la EX salen con el efecto especial del paquete de diseño (rayos dorados, estrella con su
      // rareza, campanita y su vibración). Con movimiento reducido, la estrella sin animar y sin rayos.
      if (fx.special) {
        setSpecial(card.rarity);
        bell();
      }
      el.classList.add("card3d--revealed");
      // RF-17 (spec 018, RF-6): viva si la tiene (las comunes no: spec 022), salvo con movimiento reducido.
      if (!reduced && card.live) setLiveIndex(i);
      setShown(true);
      busy.current = false;
    };
    if (reduced) {
      // RF-23: un fundido en lugar del volteo.
      gsap.timeline({ onComplete: effects }).to(el, { opacity: 0, duration: 0.12 }).set(inner, { rotationY: 0 }).to(el, { opacity: 1, duration: 0.18 });
      return;
    }
    gsap
      .timeline({ onComplete: effects })
      .to(el, { x: 0, rotation: 0, scale: 1.08, y: -14, duration: 0.22, ease: "power2.out" }, 0)
      .to(inner, { rotationY: 0, duration: 0.6, ease: "power2.inOut" }, 0.04)
      .to(el, { scale: 1.02, y: 0, duration: 0.3, ease: "power2.in" }, 0.45);
  }, [top, cards, reduced]);

  /** RF-16 y RF-18: aparta la presentada hacia el lado del gesto; tras la última, el resumen. */
  const dismiss = useCallback(
    (side: "left" | "right") => {
      if (busy.current) return;
      const i = top;
      const el = cardEls.current[i];
      if (!el) return;
      busy.current = true;
      setSpecial(null);
      whoosh();
      const next = () => {
        el.classList.remove("card3d--revealed");
        setLiveIndex(null);
        setShown(false);
        busy.current = false;
        if (i + 1 >= cards.length) setPhase("summary");
        else setTop(i + 1);
      };
      if (reduced) {
        gsap.to(el, { opacity: 0, duration: 0.2, onComplete: next });
        return;
      }
      const dir = side === "left" ? -1 : 1;
      gsap.to(el, { x: dir * (window.innerWidth * 0.75 + 200), y: -40, rotation: dir * 24, opacity: 0, duration: 0.45, ease: "power2.in", onComplete: next });
    },
    [top, cards.length, reduced],
  );

  // Las de debajo ya están en su sitio (derechas, una encima de otra): la siguiente solo se hace visible (RF-20).
  useEffect(() => {
    if (phase !== "deck" || top === 0) return;
    cardEls.current.slice(top, cards.length).forEach((el) => el && gsap.set(el, deckPose()));
  }, [top, phase, cards.length, deckPose]);

  const act = useCallback((side: "left" | "right") => (shown ? dismiss(side) : reveal()), [shown, dismiss, reveal]);
  // RF-15 y RF-16: toque o deslizamiento sobre la de arriba con eventos de puntero (dedo, ratón y lápiz por igual); la
  // carta sigue un poco al dedo mientras se arrastra. El teclado va por `onClick` (Intro o Espacio).
  const press = useRef<{ id: number; x: number } | null>(null);
  const cardGesture: React.HTMLAttributes<HTMLDivElement> = {
    onPointerDown: (e) => {
      if (busy.current) return;
      press.current = { id: e.pointerId, x: e.clientX };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e) => {
      const p = press.current;
      if (!p || p.id !== e.pointerId || reduced) return;
      const mx = e.clientX - p.x;
      gsap.set(e.currentTarget, { x: mx * 0.6, rotation: mx * 0.03 });
    },
    onPointerUp: (e) => {
      const p = press.current;
      press.current = null;
      if (!p || p.id !== e.pointerId || busy.current) return;
      const mx = e.clientX - p.x;
      if (Math.abs(mx) >= SWIPE_MIN) act(swipeSide(mx));
      // Un arrastre mínimo cuenta como toque.
      else if (Math.abs(mx) < 10) act("right");
      else if (!reduced) gsap.to(e.currentTarget, { x: 0, rotation: 0, duration: 0.25, ease: "back.out(2)" });
    },
    onPointerCancel: (e) => {
      press.current = null;
      if (!reduced) gsap.to(e.currentTarget, { x: 0, rotation: 0, duration: 0.25 });
    },
  };

  const finishedRef = useRef(false);
  useEffect(() => {
    if (phase === "summary" && !finishedRef.current) {
      finishedRef.current = true;
      onFinished?.(cards);
    }
    if (phase !== "summary") finishedRef.current = false;
  }, [phase, cards, onFinished]);

  const reset = () => {
    setError(null);
    setSpecial(null);
    setStep("inside");
    setLiveIndex(null);
    setCards([]);
    setTop(0);
    setShown(false);
    setPhase("idle");
    setPackKey((k) => k + 1);
    cardEls.current = [];
  };

  const current = phase === "deck" ? cards[top] : undefined;
  const sobreHint = view.registro.apertura === "sticker" ? t.packs.sobre.sticker.hint : t.packs.sobre.tear.hint;
  const hint =
    phase === "idle"
      ? reduced
        ? t.packs.stage.hintButton
        : sobreHint
      : phase === "deck" && current
        ? shown
          ? isSpecial(current.rarity)
            ? t.packs.sobre.special(current.name, t.common.rarity[current.rarity], top + 1, cards.length)
            : t.packs.stage.hintNext(top + 1, cards.length)
          : t.packs.stage.hintDeck(top + 1, cards.length)
        : phase === "opening"
          ? t.packs.sobre.opened
          : "";
  // Spec 030, RF-21 y RF-23: el mazo late antes de una especial; un punto por carta.
  const omenOn = phase === "deck" && omen(cards, top, shown);
  const dots = useMemo(() => (phase === "deck" ? progressDots(cards.length, top) : []), [phase, cards.length, top]);
  const showDeck = phase === "deck" || (phase === "opening" && cards.length > 0);

  return (
    <div
      ref={stage}
      // Spec 026, RF-12: la mesa de apertura se queda oscura en los dos temas.
      data-theme="kawaii"
      className="stage"
      data-phase={phase}
      data-revealed={phase === "deck" ? top + (shown ? 1 : 0) : 0}
      data-kind={view.kind}
      data-step={phase === "opening" ? step : undefined}
      data-shown={shown || undefined}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={tilt.onPointerLeave}
    >
      <div className="stage__rays" aria-hidden />
      <div className="stage__sparkles" aria-hidden>
        {SPARKLES.map(([x, y, size, color, delay], i) => (
          <span key={i} className="sparkle" style={{ left: `${x}%`, top: `${y}%`, "--s": `${size}px`, "--c": color, "--d": `${delay}s` } as React.CSSProperties} />
        ))}
      </div>
      <p className="hint" aria-live="polite">
        {error === "" ? t.packs.stage.openFailed : (error ?? hint)}
      </p>

      {/* Spec 030: el sobre del paquete de diseño, hasta que se va (RF-19); al retomar una apertura no se pinta (spec 023, RF-22). */}
      {(phase === "idle" || phase === "opening") && !(autoOpen && packKey === 0) && (
        <div className="stage__center">
          <TearPack
            key={packKey}
            ref={tear}
            view={view}
            reducedMotion={reduced}
            muted={muted}
            zone={stage}
            onCommit={onCommit}
            onOpen={() => {
              setError(null);
              open();
            }}
          />
        </div>
      )}

      <div className="cards" data-step={phase === "opening" ? step : "center"} data-omen={omenOn || undefined}>
        {/* Spec 030, RF-21 y RF-22: el halo que late antes de una especial y los rayos dorados al revelarla. */}
        <div aria-hidden className="deck-fx">
          <span className="deck-fx__omen" />
          <span className={`deck-fx__rays${special && !reduced ? " deck-fx__rays--on" : ""}`} />
        </div>
        {cards.map((c, i) => {
          const isTop = phase === "deck" && i === top;
          return (
            <Card3D
              key={`${packKey}-${c.id}-${i}`}
              ref={(el) => {
                cardEls.current[i] = el;
              }}
              card={c}
              active={isTop}
              tease={isTop && !shown ? revealFx(c.rarity).tease : 0}
              mode={tilt.mode}
              tiltTarget={tilt.target}
              style={{ zIndex: cards.length - i + 1, visibility: showDeck && i === top ? "visible" : "hidden" }}
              onClick={isTop ? () => act("right") : undefined}
              gesture={isTop ? cardGesture : undefined}
              actionLabel={shown ? t.packs.stage.dismissCard : t.packs.stage.flipCard}
              showLive={liveIndex === i}
              // Spec 034, RF-1: como en el armador, la carta sigue al puntero en toda la mesa, no solo encima de ella.
              zone={stage}
              // Spec 030, RF-27: la carta de arriba monta su versión viva antes de voltearse, para que al revelarla ya
              // esté cargada.
              preloadLive={isTop && !reduced}
            />
          );
        })}
        {special && (
          <span aria-hidden className={`deck-fx__star rarity-${special}`} data-testid="special-star">
            {RARITY_SEAL[special]}
          </span>
        )}
      </div>

      {/* Spec 030, RF-23: los puntos de avance del mazo (con una sola carta no hay). */}
      {dots.length > 0 && (
        <div className="deck-dots" aria-hidden data-testid="deck-dots">
          {dots.map((d, i) => (
            <i key={i} className={`deck-dots__dot deck-dots__dot--${d}`} />
          ))}
        </div>
      )}

      {/* RF-15: la carta presentada, como en la referencia del paquete de diseño. */}
      {current && shown && (
        <div className={`reveal-info rarity-${current.rarity}`} data-testid="reveal-info" aria-live="polite">
          {current.isNew && <p className="reveal-info__new">{t.packs.stage.newTitle}</p>}
          <span className="reveal-info__badge" aria-label={t.common.rarity[current.rarity]}>
            {RARITY_SEAL[current.rarity]}
          </span>
          <div className="reveal-info__foot">
            <p className="reveal-info__name">{current.name}</p>
            <p className="reveal-info__set">
              <span className="reveal-info__mini">{RARITY_SEAL[current.rarity]}</span>
              {setLine ?? view.code}
              {current.holo ? t.packs.stage.holoSuffix.toUpperCase() : ""}
            </p>
          </div>
        </div>
      )}

      <Particles ref={particles} disabled={reduced} />
      {flash && <div className={`flash rarity-${flash}`} aria-hidden="true" />}
      <Confetti burst={burst} />
      {party && (
        <div className={`celebrate rarity-${party}`} aria-hidden data-testid="celebration">
          <span className="celebrate__ribbon">{t.packs.stage.celebrate(t.common.rarity[party])}</span>
        </div>
      )}

      {phase === "summary" && (
        <div className="summary">
          <div className="summary__card">
            {/* Spec 030, RF-23: el resumen con el diseño del paquete («Tu sobre»), con miniaturas, rareza y «¡Nueva!». */}
            <h2 className="summary__title">
              <Sticker name="card" className="size-9" />
              {t.packs.sobre.summaryTitle}
            </h2>
            {/* Spec 014, RF-14: las cartas en miniatura con su rareza y la etiqueta «¡Nueva!». */}
            <div className="summary__grid">
              {cards.map((c, i) => (
                <div key={i} className={`summary__row rarity-${c.rarity}`}>
                  <span className={`summary__thumb ${c.holo ? "holo-finish" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagen firmada de la carta */}
                    <img src={c.image} alt="" draggable={false} />
                  </span>
                  <span className="badge">
                    {t.common.rarity[c.rarity]}
                    {c.holo ? t.packs.stage.holoSuffix : ""}
                  </span>
                  <span className="summary__name">{c.name}</span>
                  {c.note && <small className="summary__note">{c.note}</small>}
                </div>
              ))}
            </div>
            {renderSummaryActions ? (
              <div className="summary__actions">{renderSummaryActions(reset)}</div>
            ) : (
              <button type="button" className="hud__btn hud__btn--primary summary__again" onClick={reset}>
                {t.packs.stage.openAnother}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="hud">
        {/* Spec 030, RF-20: el botón voltea la de arriba y, ya revelada, la aparta y pasa a la siguiente. */}
        {phase === "deck" && current && (
          <button type="button" className="hud__btn hud__btn--primary" onClick={() => act("right")} data-testid="deck-next">
            {shown ? t.packs.sobre.nextCard : t.packs.sobre.flipCard}
          </button>
        )}
        {extraHud}
        <SoundToggle muted={muted} onToggle={(m) => sound.setMuted(m)} variant="ghost" className="hud__sound" data-testid="sound-toggle" />
        {tilt.gyroAvailable && tilt.mode !== "gyro" && (
          <button type="button" className="hud__btn" onClick={() => void tilt.requestGyro()}>
            {t.packs.stage.enableGyro}
          </button>
        )}
        {debug && <span className="hud__chip">{t.packs.stage.tiltMode(tilt.mode)}</span>}
        {debug && reduced && <span className="hud__chip">{t.packs.stage.reducedMotion}</span>}
      </div>
    </div>
  );
}
