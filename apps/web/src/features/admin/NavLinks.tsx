"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/sets", label: "Colecciones" },
  { href: "/admin/characters", label: "Personajes" },
  { href: "/admin/tiers", label: "Tiers de Patreon" },
  { href: "/admin/users", label: "Usuarios" },
];

export function NavLinks() {
  const path = usePathname();
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
            {n.label}
          </Link>
        );
      })}
      <a href="/drop-rates" target="_blank" className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white">
        Probabilidades públicas ↗
      </a>
    </nav>
  );
}
