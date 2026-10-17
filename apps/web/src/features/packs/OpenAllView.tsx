"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { RARITIES } from "@/domain/catalog/card-rules";
import { openAllPacksAction, type OpenAllCard } from "@/app/sobres/actions";
import { openAllFinale } from "@/domain/opening/feedback";
import { sound, useSoundMuted } from "@/features/opening/sound";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { SoundToggle } from "@/ui/game/SoundToggle";
import { PackArt, type PackArtData } from "./PackArt";
import "./open-all.css";

const rank = (r: OpenAllCard["rarity"]) => RARITIES.indexOf(r);

/** RF-18: abre todos los sobres de la colección y muestra las cartas, nuevas y raras primero. */
export function OpenAllView({ setId, setCode, setName, art, sealed }: { setId: string; setCode: string; setName: string; art: PackArtData; sealed: number }) {
  const [cards, setCards] = useState<OpenAllCard[] | null>(null);
  const [opened, setOpened] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const t = useT();
  const muted = useSoundMuted();
  useEffect(() => {
    void sound.preload();
  }, []);

  const sorted = useMemo(
    () =>
      [...(cards ?? [])].sort(
        (a, b) => rank(b.rarity) - rank(a.rarity) || Number(b.isNew) - Number(a.isNew) || Number(b.holo) - Number(a.holo) || a.number - b.number,
      ),
    [cards],
  );
  // Cantidad final de cada versión tras abrir todo el lote (no la de cada momento intermedio).
  const finalQty = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards ?? []) m.set(`${c.number}-${c.holo}`, Math.max(m.get(`${c.number}-${c.holo}`) ?? 0, c.qtyAfter));
    return m;
  }, [cards]);
  const stats = useMemo(() => {
    const c = cards ?? [];
    return { total: c.length, nuevas: c.filter((x) => x.isNew).length, holo: c.filter((x) => x.holo).length, pity: c.filter((x) => x.pity).length };
  }, [cards]);

  const openAll = () => {
    // El clic es el gesto que habilita el audio (spec 013, RF-2).
    sound.unlock();
    start(async () => {
      setError(null);
      const r = await openAllPacksAction(setId);
      if (!r.ok) return setError(r.error);
      setOpened(r.packs);
      setCards(r.cards);
      // Spec 013, RF-5 y RF-9: un solo sonido (y vibración) al final, el de la mejor carta.
      const finale = openAllFinale(r.cards.map((c) => c.rarity));
      if (finale) {
        sound.play(finale.sound);
        sound.vibrate(finale.vibration);
      }
    });
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          {/* Spec 014, RF-8: el mismo sobre de la colección. */}
          {!cards && <PackArt setId={setId} code={setCode} name={setName} art={art} className="w-[96px] sm:w-[120px]" />}
          <div>
            <Link href="/sobres" className="text-sm text-ui-text-3 hover:text-ui-text">
              {t.packs.openAll.backToMine}
            </Link>
            <h1 className="font-display text-3xl font-semibold">{t.packs.openAll.title(setName)}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SoundToggle muted={muted} onToggle={(m) => sound.setMuted(m)} variant="ghost" data-testid="sound-toggle" />
        {!cards && (
          <Button size="lg" onClick={openAll} loading={pending} disabled={sealed === 0} data-testid="open-all">
            {pending ? t.packs.openAll.opening : sealed === 0 ? t.packs.openAll.noneLeft : t.packs.openAll.openN(sealed)}
          </Button>
        )}
        </div>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      {cards && (
        <>
          <p className="text-ui-text-2" data-testid="open-all-summary">
            {t.packs.openAll.summary({ packs: opened, total: stats.total, fresh: stats.nuevas, holo: stats.holo })}
            {stats.pity > 0 && t.packs.openAll.summaryPity(stats.pity)}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="open-all-grid">
            {sorted.map((c, i) => (
              <li
                key={c.key}
                className={`oa-card rarity-${c.rarity} ${c.isNew ? "oa-card--new" : ""} ${c.holo ? "oa-card--holo" : ""}`}
                style={{ animationDelay: `${Math.min(i, 40) * 45}ms` }}
              >
                <div className="oa-card__art">
                  {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                  <img src={c.image} alt={c.name} loading="lazy" />
                </div>
                <div className="oa-card__meta">
                  <span className="oa-card__name">{c.name}</span>
                  <span>
                    {t.common.rarity[c.rarity]}
                    {c.holo ? t.packs.openAll.holoSuffix : ""}
                  </span>
                  <span className={c.isNew ? "text-ui-success-text" : "text-ui-text-3"}>{c.isNew ? t.packs.notes.isNew : t.packs.notes.owned(finalQty.get(`${c.number}-${c.holo}`) ?? c.qtyAfter)}</span>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="secondary" asChild>
            <Link href="/sobres">{t.packs.openAll.backToMineButton}</Link>
          </Button>
        </>
      )}
    </main>
  );
}
