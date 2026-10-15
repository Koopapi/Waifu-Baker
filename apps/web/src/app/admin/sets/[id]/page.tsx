import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { canEdit } from "@/domain/catalog/collection-rules";
import { RARITIES } from "@/domain/catalog/card-rules";
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
import { getDict } from "@/i18n/server";
import { EditSetForm } from "../forms";

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [overview, characters] = await Promise.all([getSetOverview(db, id), listCharacters(db)]);
  if (!overview) notFound();
  const { set, counts, gaps } = overview;
  const tt = await getDict();
  const t = tt.admin.set;

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
          {t.back}
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
        <h2 className="font-semibold">{t.details}</h2>
        <EditSetForm set={set} lockedForUsers={!perms.canEditRarity} />
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t.publishing}</h2>
          {cards.some((c) => c.rarity) && (
            <Link href={`/admin/sets/${set.id}/simulate`} className="rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5" data-testid="simulate-link">
              {t.simulate}
            </Link>
          )}
        </div>
        <PublishPanel setId={set.id} version={set.version} status={set.status} />
      </section>

      {overview.odds && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t.odds}</h2>
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
            <h2 className="text-lg font-semibold">{t.cards(cards.length)}</h2>
            <RegenerateButton setId={set.id} count={cards.length} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs" data-testid="rarity-counts">
            {RARITIES.map((r) => (
              <span key={r} className={`rounded-md border px-2 py-1 ${gaps.includes(r) ? "border-amber-400/50 text-amber-300" : "border-white/10 text-white/70"}`}>
                {tt.common.rarity[r]} <b className="tabular-nums">{counts[r]}</b>
              </span>
            ))}
            {counts.none > 0 && <span className="rounded-md border border-white/10 px-2 py-1 text-white/50">{t.noRarityCount(counts.none)}</span>}
          </div>
        </div>
        {(gaps.length > 0 || incomplete > 0 || unreviewed > 0) && cards.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200" data-testid="set-warnings">
            {gaps.length > 0 && <li>{t.gaps(gaps.map((g) => tt.common.rarity[g]).join(", "))}</li>}
            {incomplete > 0 && <li>{t.incomplete(incomplete)}</li>}
            {unreviewed > 0 && <li>{t.unreviewed(unreviewed)}</li>}
          </ul>
        )}
        <Dropzone setId={set.id} disabled={!perms.canAdd} />
        <CardWorkspace setId={set.id} cards={cards} characters={characters.map((c) => ({ id: c.id, name: c.name }))} perms={perms} />
      </section>
    </div>
  );
}
