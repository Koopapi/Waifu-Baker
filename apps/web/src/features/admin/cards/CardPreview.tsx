"use client";

import { useState } from "react";
import { Card3D } from "@/features/opening/Card3D";
import { useTiltSource } from "@/features/opening/useTiltSource";
import type { CardDTO } from "./types";
import { useT } from "@/i18n/client";
import { Checkbox } from "@/ui/form/Choice";
import "@/features/opening/opening.css";

/** RF-22: la carta tal como la verá el usuario, con inclinación y efecto holo. */
export function CardPreview({ card }: { card: CardDTO }) {
  const tilt = useTiltSource();
  const [holo, setHolo] = useState(card.variant === "holo");
  const t = useT().admin.cards;
  if (!card.midUrl) return <div className="grid aspect-[63/88] place-items-center rounded-l bg-ui-raised text-xs text-ui-text-3">{t.processing}</div>;
  return (
    <div className="space-y-2">
      <div
        className="card-preview grid place-items-center rounded-l bg-ui-rail p-4"
        style={{ perspective: 1200 }}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        data-testid="card-preview"
      >
        <Card3D
          card={{ id: card.id, name: card.name, number: card.number, rarity: card.rarity ?? "common", holo, image: card.midUrl, framed: true }}
          active
          mode={tilt.mode}
          tiltTarget={tilt.target}
          style={{ width: "100%" }}
        />
      </div>
      <Checkbox checked={holo} onCheckedChange={setHolo} label={t.previewHolo} />
    </div>
  );
}
