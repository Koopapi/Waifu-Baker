import Link from "next/link";
import { auth } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";

export default async function Home() {
  const session = await auth();
  const t = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_15%,#2a1350_0%,#0b0912_60%)] px-6 text-[#f1eef8]">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="max-w-xl space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-[0.18em] sm:text-5xl">{t.common.brand}</h1>
          <p className="text-lg text-white/70">{t.site.home.tagline}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={session?.user?.id ? "/sobres" : "/login?next=/sobres"} className="rounded-full bg-[#d6b370] px-6 py-3 font-semibold text-[#0b0c0e]">
            {session?.user?.id ? t.common.nav.myPacks : t.common.nav.signIn}
          </Link>
          {session?.user?.id && (
            <Link href="/coleccion" className="rounded-full border border-white/20 px-6 py-3">
              {t.common.nav.myCollection}
            </Link>
          )}
          <Link href="/drop-rates" className="rounded-full border border-white/20 px-6 py-3">
            {t.common.nav.odds}
          </Link>
        </div>
        <p className="text-xs text-white/40">{t.site.home.aiNotice}</p>
      </div>
    </main>
  );
}
