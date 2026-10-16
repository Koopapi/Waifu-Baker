import Link from "next/link";
import { auth } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";
import { isDemoEnabled } from "@/domain/demo/mode";
import { DemoLanding } from "@/features/demo/DemoLanding";

export default async function Home() {
  // Spec 010, RF-13: en modo demo, la portada ofrece los dos papeles.
  if (isDemoEnabled(process.env)) return <DemoLanding />;
  const session = await auth();
  const t = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_15%,#2a1350_0%,#0b0912_60%)] px-6 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="max-w-xl space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-[0.18em] sm:text-5xl">{t.common.brand}</h1>
          <p className="text-lg text-ui-text-2">{t.site.home.tagline}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={session?.user?.id ? "/sobres" : "/login?next=/sobres"} className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-6 py-3 font-semibold text-ui-on-accent">
            {session?.user?.id ? t.common.nav.myPacks : t.common.nav.signIn}
          </Link>
          {session?.user?.id && (
            <Link href="/coleccion" className="btn rounded-md border border-ui-line px-6 py-3 hover:bg-ui-hover">
              {t.common.nav.myCollection}
            </Link>
          )}
          <Link href="/drop-rates" className="btn rounded-md border border-ui-line px-6 py-3 hover:bg-ui-hover">
            {t.common.nav.odds}
          </Link>
        </div>
        <p className="text-xs text-ui-text-3">{t.site.home.aiNotice}</p>
      </div>
    </main>
  );
}
