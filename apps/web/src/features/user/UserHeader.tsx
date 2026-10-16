import Link from "next/link";
import { signOut } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";

/** Cabecera de las páginas del coleccionista. */
export async function UserHeader({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const t = await getDict();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ui-line px-4 py-3 sm:px-6">
      <Link href="/" className="font-extrabold tracking-[0.14em]">
        {t.common.brand}
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/sobres" className="text-ui-text-2 hover:text-white">
          {t.common.nav.myPacks}
        </Link>
        <Link href="/coleccion" className="text-ui-text-2 hover:text-white">
          {t.common.nav.myCollection}
        </Link>
        <Link href="/cuenta" className="text-ui-text-2 hover:text-white">
          {t.common.nav.myAccount}
        </Link>
        <Link href="/drop-rates" className="text-ui-text-2 hover:text-white">
          {t.common.nav.odds}
        </Link>
        {isAdmin && (
          <Link href="/admin" className="text-ui-text-2 hover:text-white">
            {t.common.nav.panel}
          </Link>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-ui-text-3 hover:text-white" title={name}>
            {t.common.nav.signOut}
          </button>
        </form>
        <LocaleToggle />
      </nav>
    </header>
  );
}
