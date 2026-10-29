"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveCard } from "@/domain/cards/live";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { Button } from "@/ui/action/Button";
import { Switch } from "@/ui/form/Choice";
import { CartaCapas, type CartaCapasHandle } from "@/ui/game/CartaCapas";
import { useReducedMotion } from "@/ui/hooks/useReducedMotion";
import { Modal } from "@/ui/overlay/Modal";
import type { BinderSlotDTO } from "./BinderView";

const pad = (n: number) => String(n).padStart(3, "0");

/** Spec 018, RF-11: solo se ofrece el giroscopio en pantallas táctiles que lo tienen (no en el ordenador). */
function useGyroAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => setAvailable("DeviceOrientationEvent" in window && window.matchMedia("(pointer: coarse)").matches), []);
  return available;
}

/**
 * Spec 006, RF-5 y RF-6: ficha de una carta con su versión holo. Spec 018, RF-7 y RF-9 a RF-14: la carta se ve viva (con
 * el interruptor «Mover con el teléfono» donde hay giroscopio); con movimiento reducido o mientras carga, la imagen fija.
 */
export function CardSheet({ slot, setCode, onClose }: { slot: BinderSlotDTO & { owned: NonNullable<BinderSlotDTO["owned"]> }; setCode: string; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const o = slot.owned;
  const [holo, setHolo] = useState(o.qty === 0 && o.holoQty > 0);
  const reduced = useReducedMotion();
  const gyroAvailable = useGyroAvailable();
  const art = useRef<HTMLDivElement>(null);
  const card = useRef<CartaCapasHandle>(null);
  const [live, setLive] = useState<LiveCard | null | undefined>(undefined);
  const [gyro, setGyro] = useState(false);
  const [denied, setDenied] = useState(false);

  // RF-16: la configuración con enlaces firmados (solo para quien tiene la carta).
  useEffect(() => {
    let alive = true;
    fetch(`/api/cards/${o.cardId}/live`)
      .then((r) => (r.ok ? (r.json() as Promise<LiveCard>) : null))
      .then((l) => alive && setLive(l))
      .catch(() => alive && setLive(null));
    return () => {
      alive = false;
    };
  }, [o.cardId]);

  async function toggleGyro(on: boolean) {
    setDenied(false);
    if (!on) {
      card.current?.deshabilitarGiroscopio();
      setGyro(false);
      return;
    }
    // RF-12 y RF-13: el permiso se pide dentro del toque (iOS lo exige); si se niega, se apaga y se avisa.
    const ok = (await card.current?.habilitarGiroscopio()) ?? false;
    setGyro(ok);
    setDenied(!ok);
  }

  const name = o.name || t.collection.binder.cardFallbackName(pad(slot.number));
  const showLive = Boolean(live) && !reduced;

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      testId="card-sheet"
      closeLabel={t.common.close}
      title={name}
      description={`${setCode} · ${pad(slot.number)} · ${o.rarity ? t.common.rarity[o.rarity] : "—"}`}
    >
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <div ref={art} className="grid touch-none place-items-center rounded-l bg-ui-rail px-6 pb-5 pt-8" data-testid="card-sheet-art">
            {showLive && live ? (
              <CartaCapas ref={card} tier={live.tier} image="" config={live.config} holo={holo} label={name} zone={art} className="w-full max-w-[280px]" />
            ) : (
              <span className={`block w-full max-w-[280px] overflow-hidden rounded-l ${holo ? "holo-finish" : ""}`} data-testid="card-sheet-flat">
                {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                <img src={o.mid} alt="" className="block aspect-[700/991] w-full object-cover" draggable={false} />
              </span>
            )}
          </div>
          {showLive && gyroAvailable && (
            <div className="space-y-1 rounded-l border border-ui-line p-3" data-testid="gyro">
              <Switch label={t.collection.binder.gyro} description={t.collection.binder.gyroHint} checked={gyro} onCheckedChange={(on) => void toggleGyro(on)} />
              {denied && (
                <p className="text-xs text-ui-warning-text" role="status" data-testid="gyro-denied">
                  {t.collection.binder.gyroDenied}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          {o.flavorText && <p className="italic text-ui-text-2">{t.collection.binder.flavorQuote(o.flavorText)}</p>}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-m border border-ui-line p-3">
              <dt className="text-ui-text-3">{t.collection.binder.normal}</dt>
              <dd className="text-xl font-semibold tabular-nums">x{o.qty}</dd>
            </div>
            <div className="rounded-m border border-ui-line p-3">
              <dt className="text-ui-text-3">{t.collection.binder.holo}</dt>
              <dd className="text-xl font-semibold tabular-nums">x{o.holoQty}</dd>
            </div>
          </dl>
          <p className="text-sm text-ui-text-3">{t.collection.binder.firstObtained(formatDate(locale, o.firstObtainedAt, "long"))}</p>
          {o.holoQty > 0 && (
            <div className="flex gap-2" role="group" aria-label={t.collection.binder.version}>
              <Button size="sm" variant={!holo ? "primary" : "secondary"} aria-pressed={!holo} onClick={() => setHolo(false)}>
                {t.collection.binder.normal}
              </Button>
              <Button size="sm" variant={holo ? "primary" : "secondary"} aria-pressed={holo} onClick={() => setHolo(true)}>
                {t.collection.binder.holo}
              </Button>
            </div>
          )}
          <p className="text-xs text-ui-text-3">{t.collection.binder.aiHint}</p>
        </div>
      </div>
    </Modal>
  );
}
