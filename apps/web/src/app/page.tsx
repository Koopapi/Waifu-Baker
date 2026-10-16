import Link from "next/link";
import { auth } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";
import { isDemoEnabled } from "@/domain/demo/mode";
import { Button } from "@/ui/action/Button";
import { DemoLanding } from "@/features/demo/DemoLanding";

export default async function Home() {
  // Spec 010, RF-13: en modo demo, la portada ofrece los dos papeles.
  if (isDemoEnabled(process.env)) return <DemoLanding />;
  const session = await auth();
  const t = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center bg-ui-rail bg-[radial-gradient(90%_70%_at_50%_20%,color-mix(in_srgb,var(--ui-accent)_22%,transparent),transparent_70%)] px-6 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="max-w-xl space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-[0.18em] sm:text-5xl">{t.common.brand}</h1>
          <p className="text-lg text-ui-text-2">{t.site.home.tagline}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href={session?.user?.id ? "/sobres" : "/login?next=/sobres"}>{session?.user?.id ? t.common.nav.myPacks : t.common.nav.signIn}</Link>
          </Button>
          {session?.user?.id && (
            <Button size="lg" variant="secondary" asChild>
              <Link href="/coleccion">{t.common.nav.myCollection}</Link>
            </Button>
          )}
          <Button size="lg" variant="secondary" asChild>
            <Link href="/drop-rates">{t.common.nav.odds}</Link>
          </Button>
        </div>
        <p className="text-xs text-ui-text-3">{t.site.home.aiNotice}</p>
      </div>
    </main>
  );
}
