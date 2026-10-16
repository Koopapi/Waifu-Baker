import Link from "next/link";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { Button } from "@/ui/action/Button";
import { getDict } from "@/i18n/server";

/** Spec 012, RF-6: un álbum oculto se ve igual que uno inexistente, sin decir que fue moderado. */
export default async function AlbumUnavailable() {
  const t = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_15%,#2a1350_0%,#0b0912_60%)] px-6 text-center" data-testid="album-unavailable">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="max-w-md space-y-5">
        <h1 className="text-3xl font-bold">{t.collection.publicAlbum.unavailable}</h1>
        <p className="text-ui-text-2">{t.collection.publicAlbum.unavailableBody}</p>
        <Button size="lg" asChild>
          <Link href="/">{t.site.notFound.home}</Link>
        </Button>
      </div>
    </main>
  );
}
