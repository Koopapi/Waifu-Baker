import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { getDict, getLocale } from "@/i18n/server";
import { gamesDictionaries } from "@/i18n/games";
import { requireUser } from "@/server/auth/require-user";
import { cardImageUrl } from "@/server/cards/image-urls";
import { characterLine } from "@/server/services/bonds";
import { CharacterLineView } from "@/features/collection/CharacterLineView";
import { BondBar } from "@/ui/game/BondBar";

/** Spec 029, RF-15 a RF-17: la línea de un personaje, su vínculo, sus repetidas, el polvo y fabricar. */
export default async function CharacterPage({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  if (!z.string().uuid().safeParse(characterId).success) notFound();
  const user = await requireUser(`/collection/character/${characterId}`);
  const [line, t, locale] = await Promise.all([characterLine(db, user.id, characterId), getDict(), getLocale()]);
  if (!line) notFound();
  const tb = gamesDictionaries[locale].bond;
  const { bond } = line;
  const title = bond.titleLevel ? (bond.customTitle ?? tb.titles[`${bond.titleLevel}`]) : null;
  const span = bond.to === null ? 1 : bond.to - bond.from;
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <div className="space-y-1">
        <Link href="/collection" className="text-sm text-ui-text-3 hover:text-ui-text">
          {tb.back}
        </Link>
        <h1 className="text-3xl font-bold" data-testid="character-name">
          {line.character.name}
        </h1>
        <p className="max-w-2xl text-sm text-ui-text-2">{tb.lineIntro}</p>
      </div>
      <BondBar
        label={tb.barLabel(line.character.name)}
        levelLabel={tb.level(bond.level)}
        title={title}
        pointsLabel={tb.points(bond.xp, bond.to)}
        value={bond.to === null ? 1 : bond.xp - bond.from}
        max={span}
        hint={`${tb.next[bond.next?.unlock ?? "none"]} · ${tb.perLevel}`}
      />
      <p className="text-sm" data-testid="dust-balance">
        <span className="font-semibold">{tb.dust(line.dust)}</span> <span className="text-ui-text-3">· {tb.dustHint}</span>
      </p>
      <CharacterLineView
        characterId={line.character.id}
        characterName={line.character.name}
        recyclableTotal={line.recyclableTotal}
        cards={line.cards.map((c) => ({
          ...c,
          rarityLabel: t.common.rarity[c.rarity],
          thumb: c.owned.normal + c.owned.holo > 0 ? cardImageUrl(c.cardId, "thumb", user.id) : null,
        }))}
      />
    </main>
  );
}
