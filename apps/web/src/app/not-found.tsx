import Link from "next/link";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.site.notFound.title };
}

export default async function NotFound() {
  const t = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_15%,#2a1350_0%,#0b0912_60%)] px-6 text-center">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="max-w-md space-y-5">
        <p className="font-mono text-sm tracking-[0.3em] text-ui-text-3">404</p>
        <h1 className="text-3xl font-bold">{t.site.notFound.heading}</h1>
        <p className="text-ui-text-2">{t.site.notFound.body}</p>
        <Link href="/" className="inline-block btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-6 py-3 font-semibold text-ui-on-accent">
          {t.site.notFound.home}
        </Link>
      </div>
    </main>
  );
}
