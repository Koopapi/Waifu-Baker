import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";
import { publicAlbum } from "@/server/services/album";

export const dynamic = "force-dynamic";

const load = cache((slug: string) => (/^[0-9A-Za-z]{12}$/.test(slug) ? publicAlbum(db, slug) : Promise.resolve(null)));
const pad = (n: number) => String(n).padStart(3, "0");

/** RF-16 y RF-17: vista previa para redes y sin indexar. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [a, t] = await Promise.all([load(slug), getDict()]);
  const robots = { index: false, follow: false };
  if (!a) return { title: t.collection.publicAlbum.notFoundTitle, robots };
  const title = t.collection.publicAlbum.title(a.alias);
  const full = `${title} · Waifu Baker`;
  const description = t.collection.publicAlbum.description(a.totals.owned, a.totals.total);
  return { title, description, robots, openGraph: { title: full, description, type: "website" }, twitter: { card: "summary_large_image", title: full, description } };
}

/** RF-13 a RF-15: álbum público, sin sesión. */
export default async function PublicAlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [a, t] = await Promise.all([load(slug), getDict()]);
  if (!a) notFound();
  const img = (cardId: string) => `/api/album/${a.slug}/img?c=${cardId}`;
  const pct = a.totals.total ? Math.round((a.totals.owned / a.totals.total) * 100) : 0;
  return (
    <div className="min-h-dvh bg-[radial-gradient(120%_60%_at_50%_0%,#2a1350_0%,#0b0912_60%)] text-[#f1eef8]">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="font-extrabold tracking-[0.14em]">
          {t.common.brand}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">{t.collection.publicAlbum.badge}</span>
          <LocaleToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-16 pt-6 sm:px-6">
        <section className="space-y-3 text-center">
          <h1 className="text-4xl font-extrabold" data-testid="album-alias">
            {a.alias}
          </h1>
          <p className="text-white/70" data-testid="album-totals">
            {t.collection.publicAlbum.totals(a.totals.owned, a.totals.total, pct)}
          </p>
        </section>

        {a.featured.length > 0 && (
          <section className="space-y-4" data-testid="album-featured">
            <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-white/50">{t.collection.publicAlbum.featured}</h2>
            <ul className="flex flex-wrap justify-center gap-4">
              {a.featured.map((c) => (
                <li key={c.cardId} className={`w-[min(40vw,200px)] rarity-${c.rarity ?? "common"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagen pública con marca de agua */}
                  <img src={img(c.cardId)} alt={c.name} className="aspect-[63/88] w-full rounded-xl object-cover shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />
                  <p className="mt-2 text-center text-sm">{c.name}</p>
                  <p className="text-center text-xs text-white/50">
                    {c.setCode} · {pad(c.number)} · {c.rarity ? t.common.rarity[c.rarity] : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {a.collections.length === 0 && <p className="text-center text-white/50">{t.collection.publicAlbum.noCollections}</p>}
        {a.collections.map((col) => (
          <section key={col.setId} className="space-y-4" data-testid={`album-collection-${col.code}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-bold">
                <span className="mr-2 font-mono text-sm text-white/50">{col.code}</span>
                {col.name}
              </h2>
              <span className="tabular-nums text-white/70">
                {col.progress.owned}/{col.progress.total}
              </span>
            </div>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
              {col.slots.map((s) =>
                s.owned ? (
                  <li key={s.number} data-slot={s.number}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagen pública con marca de agua */}
                    <img src={img(s.owned.cardId)} alt={s.owned.name} loading="lazy" className="aspect-[63/88] w-full rounded-lg object-cover" />
                  </li>
                ) : (
                  <li key={s.number} data-slot={s.number} data-missing="true">
                    <div className="grid aspect-[63/88] w-full place-items-center rounded-lg border-2 border-dashed border-white/10">
                      <span className="font-mono text-sm text-white/25">{pad(s.number)}</span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
        <p className="text-center text-xs text-white/40">{t.collection.publicAlbum.footer}</p>
      </main>
    </div>
  );
}
