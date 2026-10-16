import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { getDict } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { cardImageUrl } from "@/server/cards/image-urls";
import { myBinder } from "@/server/services/collection";
import { BinderView, type BinderSlotDTO } from "@/features/collection/BinderView";

/** RF-2 a RF-7: el álbum de una colección con huecos, filtros y ficha. */
export default async function BinderPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  if (!z.string().uuid().safeParse(setId).success) notFound();
  const user = await requireUser(`/coleccion/${setId}`);
  const [b, t] = await Promise.all([myBinder(db, user.id, setId), getDict()]);
  if (!b) notFound();
  const slots: BinderSlotDTO[] = b.slots.map((s) =>
    s.owned
      ? {
          number: s.number,
          owned: {
            ...s.owned,
            firstObtainedAt: s.owned.firstObtainedAt.toISOString(),
            thumb: cardImageUrl(s.owned.cardId, "thumb", user.id),
            mid: cardImageUrl(s.owned.cardId, "mid", user.id),
          },
        }
      : { number: s.number, owned: null },
  );
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <div>
        <Link href="/coleccion" className="text-sm text-ui-text-3 hover:text-white">
          {t.collection.backToCollection}
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold">{b.set.name}</h1>
          {!b.locked && (
            <span className="text-ui-text-2 tabular-nums" data-testid="binder-progress">
              {t.collection.progress(b.progress.owned, b.progress.total)}
            </span>
          )}
        </div>
      </div>
      {b.locked ? (
        <p className="text-rose-200">{t.collection.adultLocked}</p>
      ) : (
        <BinderView slots={slots} setCode={b.set.code} />
      )}
    </main>
  );
}
