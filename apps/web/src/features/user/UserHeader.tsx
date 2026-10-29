import Link from "next/link";
import { signOut } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { Button } from "@/ui/action/Button";
import { getDict } from "@/i18n/server";

/** Cabecera de las páginas en modo foco (apertura de sobres): el resto usa la estructura de la spec 010. */
export async function UserHeader({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const t = await getDict();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ui-line px-4 py-3 sm:px-6">
      <Link href="/" className="font-extrabold tracking-[0.14em]">
        {t.common.brand}
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/packs" className="text-ui-text-2 hover:text-ui-text">
          {t.common.nav.myPacks}
        </Link>
        <Link href="/collection" className="text-ui-text-2 hover:text-ui-text">
          {t.common.nav.myCollection}
        </Link>
        <Link href="/account" className="text-ui-text-2 hover:text-ui-text">
          {t.common.nav.myAccount}
        </Link>
        <Link href="/drop-rates" className="text-ui-text-2 hover:text-ui-text">
          {t.common.nav.odds}
        </Link>
        {isAdmin && (
          <Link href="/admin" className="text-ui-text-2 hover:text-ui-text">
            {t.common.nav.panel}
          </Link>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm" title={name}>
            {t.common.nav.signOut}
          </Button>
        </form>
        <LocaleToggle />
      </nav>
    </header>
  );
}
