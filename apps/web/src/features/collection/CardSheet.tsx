"use client";

import { useState } from "react";
import { useLocale, useT } from "@/i18n/client";
import { formatDate } from "@/i18n/format";
import { Card3D } from "@/features/opening/Card3D";
import { useTiltSource } from "@/features/opening/useTiltSource";
import { Button } from "@/ui/action/Button";
import { Modal } from "@/ui/overlay/Modal";
import type { BinderSlotDTO } from "./BinderView";

const pad = (n: number) => String(n).padStart(3, "0");

/** Spec 006, RF-5 y RF-6: ficha de una carta con su versión holo. Se descarga al abrir la primera. */
export function CardSheet({ slot, setCode, onClose }: { slot: BinderSlotDTO & { owned: NonNullable<BinderSlotDTO["owned"]> }; setCode: string; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const tilt = useTiltSource();
  const o = slot.owned;
  const [holo, setHolo] = useState(o.qty === 0 && o.holoQty > 0);
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      testId="card-sheet"
      closeLabel={t.common.close}
      title={o.name || t.collection.binder.cardFallbackName(pad(slot.number))}
      description={`${setCode} · ${pad(slot.number)} · ${o.rarity ? t.common.rarity[o.rarity] : "—"}`}
    >
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div
          className="grid place-items-center rounded-l bg-ui-rail p-4"
          style={{ perspective: 1200 }}
          data-testid="card-sheet-art"
          onPointerMove={tilt.onPointerMove}
          onPointerLeave={tilt.onPointerLeave}
        >
          <Card3D
            card={{ id: o.cardId, name: o.name, number: slot.number, rarity: o.rarity ?? "common", holo, image: o.mid, framed: true }}
            active
            mode={tilt.mode}
            tiltTarget={tilt.target}
            style={{ width: "100%" }}
          />
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
