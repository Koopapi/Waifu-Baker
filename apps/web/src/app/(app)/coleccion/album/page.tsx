import Link from "next/link";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { getDict } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { cardImageUrl } from "@/server/cards/image-urls";
import { featurableCards, getMyAlbum } from "@/server/services/album";
import { AlbumSettings } from "@/features/collection/AlbumSettings";

/** RF-8 a RF-12: ajustes del álbum público. */
export default async function AlbumSettingsPage() {
  const user = await requireUser("/coleccion/album");
  const [album, cards, t] = await Promise.all([getMyAlbum(db, user.id), featurableCards(db, user.id), getDict()]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <Link href="/coleccion" className="text-sm text-ui-text-3 hover:text-ui-text">
          {t.collection.backToCollection}
        </Link>
        <h1 className="text-3xl font-bold">{t.collection.album.pageTitle}</h1>
        <p className="mt-1 max-w-prose text-ui-text-2">
          {t.collection.album.intro}
        </p>
      </div>
      <AlbumSettings
        album={album ? { isPublic: album.isPublic, alias: album.alias, url: `${origin}/album/${album.slug}`, featured: album.featuredCardIds } : null}
        cards={cards.map((c) => ({ ...c, rarity: c.rarity ?? "common", thumb: cardImageUrl(c.cardId, "thumb", user.id) }))}
      />
    </main>
  );
}
