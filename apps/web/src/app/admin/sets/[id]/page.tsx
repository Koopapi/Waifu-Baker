import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { canEdit } from "@/domain/catalog/collection-rules";
import { RARITIES, RARITY_LABEL } from "@/domain/catalog/card-rules";
import { cardChances } from "@/domain/catalog/odds";
import { OddsEditor } from "@/features/admin/sets/OddsEditor";
import { PublishPanel } from "@/features/admin/sets/PublishPanel";
import { getSetOverview } from "@/server/services/cards";
import { listCharacters } from "@/server/services/characters";
import { AdultBadge, StatusBadge } from "@/features/admin/ui";
import { Dropzone } from "@/features/admin/cards/Dropzone";
import { CardWorkspace } from "@/features/admin/cards/CardWorkspace";
import { RegenerateButton } from "@/features/admin/cards/RegenerateButton";
import { assetUrl, type CardDTO } from "@/features/admin/cards/types";
import { EditSetForm } from "../forms";

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [overview, characters] = await Promise.all([getSetOverview(db, id), listCharacters(db)]);
  if (!overview) notFound();
  const { set, counts, gaps } = overview;

  const perms = {
    canAdd: canEdit(set.status, "addCard"),
    canReorder: canEdit(set.status, "number"),
    canRemove: canEdit(set.status, "removeCard"),
    canEditRarity: canEdit(set.status, "rarity"),
    isAdultSet: set.isAdult,
  };
  const slots = overview.odds?.slots ?? [];
  const chances = cardChances(overview.cards, slots);
  const cards: CardDTO[] = overview.cards.map((c) => ({
    id: c.id,
    number: c.number,
    name: c.name,
    flavorText: c.flavorText,
    rarity: c.rarity,
    variant: c.variant,
    characterId: c.characterId,
    characterName: c.characterName,
    status: c.status,
    version: c.version,
    thumbUrl: assetUrl(c.keyThumb),
    midUrl: assetUrl(c.keyMid),
    fullUrl: assetUrl(c.keyFull),
    adultReviewedAt: c.adultReviewedAt ? c.adultReviewedAt.toISOString() : null,
    pendingArtUrl: assetUrl(c.pendingOriginalKey),
    chance: chances.get(c.id) ?? 0,
  }));
  const unreviewed = set.isAdult ? cards.filter((c) => !c.adultReviewedAt || c.pendingArtUrl).length : 0;
  const incomplete = cards.filter((c) => c.status !== "ready").length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Link href="/admin/sets" className="text-sm text-white/50 hover:text-white">
          ← Colecciones
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            <span className="font-mono text-white/60">{set.code}</span> · {set.name}
          </h1>
          <StatusBadge status={set.status} />
          <AdultBadge adult={set.isAdult} />
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="font-semibold">Datos de la colección</h2>
        <EditSetForm set={set} lockedForUsers={!perms.canEditRarity} />
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Publicación</h2>
          {cards.some((c) => c.rarity) && (
            <Link href={`/admin/sets/${set.id}/simulate`} className="rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5" data-testid="simulate-link">
              Simular un sobre
            </Link>
          )}
        </div>
        <PublishPanel setId={set.id} version={set.version} status={set.status} />
      </section>

      {overview.odds && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Probabilidades del sobre</h2>
          <OddsEditor
            setId={set.id}
            version={set.version}
            slots={slots.map((s) => ({ common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, secret: 0, ...s }))}
            holoChance={overview.odds.holoChance}
            pityThreshold={overview.odds.pityThreshold}
            locked={!canEdit(set.status, "odds")}
            cardCounts={{ common: counts.common, uncommon: counts.uncommon, rare: counts.rare, epic: counts.epic, legendary: counts.legendary, secret: counts.secret }}
          />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold">Cartas ({cards.length})</h2>
            <RegenerateButton setId={set.id} count={cards.length} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs" data-testid="rarity-counts">
            {RARITIES.map((r) => (
              <span key={r} className={`rounded-md border px-2 py-1 ${gaps.includes(r) ? "border-amber-400/50 text-amber-300" : "border-white/10 text-white/70"}`}>
                {RARITY_LABEL[r]} <b className="tabular-nums">{counts[r]}</b>
              </span>
            ))}
            {counts.none > 0 && <span className="rounded-md border border-white/10 px-2 py-1 text-white/50">Sin rareza {counts.none}</span>}
          </div>
        </div>
        {(gaps.length > 0 || incomplete > 0 || unreviewed > 0) && cards.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200" data-testid="set-warnings">
            {gaps.length > 0 && <li>Sin cartas para rarezas que pueden salir en el sobre: {gaps.map((g) => RARITY_LABEL[g]).join(", ")}.</li>}
            {incomplete > 0 && <li>{incomplete} carta(s) incompleta(s): les falta personaje, nombre o rareza.</li>}
            {unreviewed > 0 && <li>{unreviewed} carta(s) sin la revisión 18+ «personaje claramente adulto».</li>}
          </ul>
        )}
        <Dropzone setId={set.id} disabled={!perms.canAdd} />
        <CardWorkspace setId={set.id} cards={cards} characters={characters.map((c) => ({ id: c.id, name: c.name }))} perms={perms} />
      </section>
    </div>
  );
}
