import { db } from "@/db/client";
import { gamesDictionaries } from "@/i18n/games";
import { getLocale } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { cardImage, holoImageIds } from "@/server/cards/card-image";
import { now } from "@/server/clock";
import { expeditionsHome } from "@/server/services/expeditions";
import { withSilverPacks } from "@/server/services/pack-designs";
import { claimableSets } from "@/server/services/rewards";
import { patreonPageUrl } from "@/server/services/patron";
import { ExpeditionsView, type ExpeditionsDTO } from "@/features/games/ExpeditionsView";

export async function generateMetadata() {
  return { title: gamesDictionaries[await getLocale()].expeditions.title };
}

/** Spec 020, RF-3 a RF-24: mapa, equipos, preparar, reclamar y reporte. El servidor decide; la página solo muestra. */
export default async function ExpeditionsPage() {
  const user = await requireUser("/games/expeditions");
  const at = now();
  const [home, plainSets] = await Promise.all([expeditionsHome(db, user.id, at), claimableSets(db)]);
  // Spec 037, RF-3: el sobre del premio, con su diseño.
  const sets = await withSilverPacks(db, user.id, plainSets, at.getTime());
  const holoImages = await holoImageIds(db, home.cards.map((c) => c.cardId));
  const data: ExpeditionsDTO = {
    serverNow: at.toISOString(),
    profile: home.profile,
    slots: home.slots,
    patron: home.patron,
    patreonUrl: patreonPageUrl(),
    zones: home.zones.map((z) => ({
      id: z.id,
      name: z.name,
      terrain: z.terrain,
      difficulty: z.difficulty,
      fragmentsRequired: z.fragmentsRequired,
      open: z.open,
      loot: z.loot,
      image: z.hasImage ? `/api/zones/${z.id}/img?v=${z.imageVersion}` : null,
    })),
    expeditions: home.expeditions.map((e) => ({
      id: e.id,
      zoneId: e.zoneId,
      zoneName: e.zoneName,
      durationMin: e.durationMin,
      endsAt: e.endsAt.toISOString(),
      rating: e.rating,
      team: e.team.map((m) => ({ cardId: m.cardId, holo: m.holo, name: m.name, characterId: m.characterId })),
    })),
    pendingPacks: home.pendingPacks.map((e) => ({ id: e.id, zoneName: e.zoneName })),
    cards: home.cards.map((c) => {
      const img = cardImage(c.cardId, "thumb", user.id, { holoCopy: c.holo, holoImage: holoImages.has(c.cardId) }, at.getTime());
      return { ...c, thumb: img.src, holoFinish: img.holoFinish };
    }),
    sets,
  };
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <ExpeditionsView data={data} />
    </main>
  );
}
