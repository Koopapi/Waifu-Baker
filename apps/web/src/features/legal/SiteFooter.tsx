import Link from "next/link";
import { getDict } from "@/i18n/server";

/** Spec 007, RF-4: enlaces legales en el pie de todas las páginas. */
export async function SiteFooter() {
  const t = (await getDict()).legal.footer;
  return (
    <footer className="ui-ink ui-footer border-t border-ui-line bg-ui-bg px-4 py-6 text-xs text-ui-text-3 sm:px-6" data-testid="site-footer">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2">
        <span>{t.rights}</span>
        <Link href="/legal/terms" className="hover:text-ui-text">
          {t.terms}
        </Link>
        <Link href="/legal/privacy" className="hover:text-ui-text">
          {t.privacy}
        </Link>
        <Link href="/legal/content" className="hover:text-ui-text">
          {t.content}
        </Link>
        <Link href="/drop-rates" className="hover:text-ui-text">
          {t.odds}
        </Link>
      </nav>
    </footer>
  );
}
