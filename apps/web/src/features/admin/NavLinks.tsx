"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

const NAV = [
  { href: "/admin", key: "overview" },
  { href: "/admin/sets", key: "sets" },
  { href: "/admin/characters", key: "characters" },
  { href: "/admin/tiers", key: "tiers" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/metricas", key: "metrics" },
] as const;

export function NavLinks() {
  const path = usePathname();
  const t = useT().admin.nav;
  return (
    <nav className="flex flex-wrap gap-1 md:flex-col">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-white/10 font-semibold text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
          >
            {t[n.key]}
          </Link>
        );
      })}
      <a href="/drop-rates" target="_blank" className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white">
        {t.publicOdds}
      </a>
    </nav>
  );
}
