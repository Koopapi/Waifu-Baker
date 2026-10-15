"use client";

import { useState } from "react";
import { Card3D } from "@/features/opening/Card3D";
import { useTiltSource } from "@/features/opening/useTiltSource";
import type { CardDTO } from "./types";
import "@/features/opening/opening.css";

/** RF-22: la carta tal como la verá el usuario, con inclinación y efecto holo. */
export function CardPreview({ card }: { card: CardDTO }) {
  const tilt = useTiltSource();
  const [holo, setHolo] = useState(card.variant === "holo");
  if (!card.midUrl) return <div className="grid aspect-[63/88] place-items-center rounded-xl bg-white/5 text-xs text-white/40">Procesando…</div>;
  return (
    <div className="space-y-2">
      <div
        className="card-preview grid place-items-center rounded-xl bg-[radial-gradient(120%_80%_at_50%_15%,#1d1236_0%,#0b0912_70%)] p-4"
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
      <label className="flex items-center gap-2 text-xs text-white/60">
        <input type="checkbox" checked={holo} onChange={(e) => setHolo(e.target.checked)} /> Ver con efecto holo
      </label>
    </div>
  );
}
