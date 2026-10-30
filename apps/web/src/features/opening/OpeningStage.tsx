"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useT } from "@/i18n/client";
import { drawFakePack, type LabCard, type Rarity } from "./fakePack";
import { TearPack } from "./TearPack";
import { Card3D } from "./Card3D";
import { Particles, type ParticlesHandle } from "./Particles";
import { useTiltSource } from "./useTiltSource";
import { celebrates, confettiCount, revealSound, teaseLevel, vibrationPattern } from "@/domain/opening/feedback";
import { SWIPE_MIN, revealOrder, swipeSide } from "@/domain/opening/deck";
import { RARITY_SEAL } from "@/domain/catalog/rarity-tier";
import type { PackShellProps } from "@/features/packs/PackShell";
import { Confetti, type ConfettiBurst } from "@/ui/game/Confetti";
import { Sticker } from "@/ui/icons/Sticker";
import { SoundToggle } from "@/ui/game/SoundToggle";
import { sound, useSoundMuted } from "@/features/sound/engine";
import { useReducedMotion } from "@/ui/hooks/useReducedMotion";
import "./opening.css";

/** idle: sobre cerrado · opening: la tira salió y se espera al servidor · deck: el mazo · summary: el resumen. */
type Phase = "idle" | "opening" | "deck" | "summary";

/** Spec 014, RF-9: destellos del fondo (posición en %, tamaño, color y retardo). */
const SPARKLES: [number, number, number, string, number][] = [
  [10, 14, 10, "#ffe27a", 0], [84, 19, 14, "#ff9ecb", 0.6], [15, 74, 12, "#7ef0c9", 1.1], [82, 66, 10, "#ffffff", 0.3],
  [51, 11, 8, "#7cc8ff", 1.6], [90, 83, 12, "#b79cff", 0.9], [7, 45, 8, "#ffffff", 1.9], [91, 39, 9, "#ffe27a", 0.4],
  [30, 88, 9, "#ff9ecb", 1.3], [64, 92, 8, "#7ef0c9", 0.2], [25, 28, 6, "#ffffff", 2.1], [72, 30, 6, "#ffffff", 1.4],
];
const FLASH_RARITIES: Rarity[] = ["epic", "legendary", "ex"];
/** El sobre del laboratorio (sin colección real). */
const LAB_SHELL: Omit<PackShellProps, "state" | "className"> = {
  setId: "lab",
  code: "LAB",
  name: "Laboratorio",
  art: { coverVersion: null, packImage: null },
  kind: "silver",
  kindLabel: "Plata",
};

interface StageProps {
  /** Fuente de cartas del sobre. Por defecto, datos falsos del laboratorio. */
  draw?: () => Promise<LabCard[]>;
  /** Spec 023: el sobre de la colección (imagen, nombre, código y tipo). */
  shell?: Omit<PackShellProps, "state" | "className">;
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
 * arriba se revela con un toque o deslizando (RF-15) y se presenta como en la referencia de Bruno («¡Nueva!», insignia de
 * rareza, nombre y colección); otro gesto la aparta hacia ese lado (RF-16) y, tras la última, el resumen (RF-18).
 */
export function OpeningStage({ draw, shell = LAB_SHELL, setLine, autoOpen = false, extraHud, onFinished, renderSummaryActions, debug = false }: StageProps = {}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>(autoOpen ? "opening" : "idle");
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

  const muted = useSoundMuted();
  // Spec 013, RF-6: los sonidos se descargan al entrar en la apertura, sin retrasar la animación.
  useEffect(() => {
    void sound.preload();
  }, []);
  const onCommit = useCallback(() => {
    sound.unlock();
    sound.play("tear");
  }, []);

  // RF-10 y RF-11: el contenido se pide al confirmar el rasgado; si falla, el sobre vuelve cerrado y se puede reintentar.
  const open = useCallback(() => {
    setPhase("opening");
    void (async () => {
      try {
        const next = draw ? await draw() : drawFakePack();
        cardEls.current = [];
        setCards(revealOrder(next));
        setTop(0);
        setShown(false);
        setPhase("deck");
      } catch (e) {
        // Cadena vacía = error sin mensaje: se muestra el texto genérico en el idioma activo.
        setError(e instanceof Error ? e.message : "");
        setPhase("idle");
        setPackKey((k) => k + 1);
      }
    })();
  }, [draw]);

  // RF-22: retomar sin rasgar.
  const resumed = useRef(false);
  useEffect(() => {
    if (!autoOpen || resumed.current) return;
    resumed.current = true;
    open();
  }, [autoOpen, open]);

  /** Sitio de cada carta en el mazo: la de arriba en el centro y las demás asomando debajo. */
  const deckPose = useCallback((depth: number) => ({ x: depth === 0 ? 0 : depth % 2 ? 7 : -6, y: depth * 7, rotation: depth === 0 ? 0 : depth % 2 ? 3 : -3, scale: 1 - depth * 0.025 }), []);

  // RF-12: las cartas salen del sobre y se apilan boca abajo.
  useEffect(() => {
    if (phase !== "deck" || top !== 0 || shown) return;
    const els = cardEls.current.slice(0, cards.length).filter((e): e is HTMLDivElement => Boolean(e));
    if (els.length === 0 || els.length !== cards.length) return;
    gsap.set(
      els.map((el) => el.querySelector(".card3d__inner")),
      { rotationY: 180 },
    );
    gsap.set(els, { y: "38vh", scale: 0.55, opacity: 0, rotation: 0, x: 0 });
    const tl = gsap.timeline();
    els.forEach((el, i) => {
      const depth = i;
      tl.to(el, { ...deckPose(depth), opacity: 1, duration: reduced ? 0.2 : 0.6, ease: "back.out(1.3)" }, reduced ? 0 : 0.1 + (els.length - 1 - i) * 0.07);
    });
    return () => {
      tl.kill();
    };
  }, [phase, cards.length, reduced, deckPose, top, shown]);

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
      // Spec 013, RF-4 y RF-9: las raras o mejores suenan y vibran según su nivel.
      const extra = revealSound(card.rarity);
      if (extra) sound.play(extra);
      sound.vibrate(vibrationPattern(card.rarity));
      const r = el.getBoundingClientRect();
      particles.current?.burst(r.left + r.width / 2, r.top + r.height / 2, card.rarity);
      if (!reduced && confettiCount(card.rarity) > 0) setBurst({ key: Date.now(), count: confettiCount(card.rarity), x: r.left + r.width / 2, y: r.top + r.height / 2 });
      if (!reduced && celebrates(card.rarity)) {
        setParty(card.rarity);
        window.setTimeout(() => setParty(null), 1600);
      }
      if (FLASH_RARITIES.includes(card.rarity) && !reduced) {
        setFlash(card.rarity);
        window.setTimeout(() => setFlash(null), 400);
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

  // Las de debajo suben un puesto cuando se aparta la de arriba.
  useEffect(() => {
    if (phase !== "deck" || top === 0) return;
    cardEls.current.slice(top, cards.length).forEach((el, k) => el && gsap.to(el, { ...deckPose(k), duration: reduced ? 0.15 : 0.35, ease: "power2.out" }));
  }, [top, phase, cards.length, reduced, deckPose]);

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
    setLiveIndex(null);
    setCards([]);
    setTop(0);
    setShown(false);
    setPhase("idle");
    setPackKey((k) => k + 1);
    cardEls.current = [];
  };

  const current = phase === "deck" ? cards[top] : undefined;
  const hint =
    phase === "idle"
      ? reduced
        ? t.packs.stage.hintButton
        : t.packs.stage.hintSwipe
      : phase === "deck"
        ? shown
          ? t.packs.stage.hintNext(top + 1, cards.length)
          : t.packs.stage.hintDeck(top + 1, cards.length)
        : phase === "opening"
          ? "..."
          : "";

  return (
    <div
      ref={stage}
      // Spec 026, RF-12: la mesa de apertura se queda oscura en los dos temas.
      data-theme="kawaii"
      className="stage"
      data-phase={phase}
      data-revealed={phase === "deck" ? top + (shown ? 1 : 0) : 0}
      data-kind={shell.kind}
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

      {phase !== "summary" && (
        <div className="stage__center">
          <TearPack
            key={packKey}
            shell={shell}
            reducedMotion={reduced}
            onCommit={onCommit}
            onOpen={() => {
              setError(null);
              open();
            }}
            mode={tilt.mode}
            tiltTarget={tilt.target}
            startOpen={autoOpen && packKey === 0}
          />
        </div>
      )}

      <div className="cards">
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
              tease={isTop && !shown ? teaseLevel(c.rarity) : 0}
              mode={tilt.mode}
              tiltTarget={tilt.target}
              style={{ zIndex: cards.length - i, visibility: phase === "deck" && i >= top ? "visible" : "hidden" }}
              onClick={isTop ? () => act("right") : undefined}
              gesture={isTop ? cardGesture : undefined}
              actionLabel={shown ? t.packs.stage.dismissCard : t.packs.stage.flipCard}
              showLive={liveIndex === i}
            />
          );
        })}
      </div>

      {/* RF-15: la carta presentada, como en la referencia de Bruno. */}
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
              {setLine ?? shell.code}
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
            <h2 className="summary__title">
              <Sticker name="card" className="size-9" />
              {t.packs.stage.summaryTitle}
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
