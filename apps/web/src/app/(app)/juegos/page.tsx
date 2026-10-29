import Link from "next/link";
import { db } from "@/db/client";
import { gamesDictionaries } from "@/i18n/games";
import { getLocale } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { now } from "@/server/clock";
import { expeditionsReady } from "@/server/services/expeditions";
import { Badge } from "@/ui/content/Badge";
import { Sticker } from "@/ui/icons/Sticker";

export async function generateMetadata() {
  return { title: gamesDictionaries[await getLocale()].hub.title };
}

/** Spec 020, RF-1: el espacio de juegos, con Expediciones como primer juego. */
export default async function GamesPage() {
  const user = await requireUser("/juegos");
  const [t, ready] = await Promise.all([getLocale().then((l) => gamesDictionaries[l]), expeditionsReady(db, user.id, now())]);
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t.hub.title}</h1>
        <p className="text-sm text-ui-text-2">{t.hub.intro}</p>
      </header>
      <Link
        href="/juegos/expediciones"
        className="group flex items-center gap-4 rounded-xl border border-ui-line bg-ui-raised p-4 transition-[transform,border-color] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-ui-accent motion-reduce:transition-none"
        data-testid="game-expeditions"
      >
        <Sticker name="map" className="size-16" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-center gap-2 font-display text-xl font-semibold">
            {t.hub.expeditions}
            {ready > 0 && <Badge tone="success">{t.hub.ready(ready)}</Badge>}
          </span>
          <span className="block text-sm text-ui-text-2">{t.hub.expeditionsDetail}</span>
        </span>
        <span className="hidden rounded-m bg-ui-accent px-4 py-2 text-sm font-semibold text-ui-on-accent sm:block">{t.hub.play}</span>
      </Link>
    </main>
  );
}
