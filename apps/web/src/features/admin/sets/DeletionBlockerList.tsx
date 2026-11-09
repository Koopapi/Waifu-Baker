"use client";

import Link from "next/link";
import type { DeletionBlocker } from "@/domain/catalog/set-deletion";
import { useT } from "@/i18n/client";

/** Spec 032, RF-9 y RF-12: por qué no se puede eliminar, cada motivo con el enlace a donde se arregla. */
export function DeletionBlockerList({ blockers, onNavigate }: { blockers: readonly DeletionBlocker[]; onNavigate?: () => void }) {
  return (
    <ul className="mt-2 space-y-2">
      {blockers.map((b, i) => (
        <BlockerItem key={i} blocker={b} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}

function BlockerItem({ blocker, onNavigate }: { blocker: DeletionBlocker; onNavigate?: () => void }) {
  const t = useT().admin.deleteSet;
  const link = (href: string, label: string) => (
    <Link href={href} onClick={onNavigate} className="ml-1 underline decoration-ui-line underline-offset-4 hover:decoration-ui-text">
      {label}
    </Link>
  );
  switch (blocker.kind) {
    case "owners":
      return <li data-testid="delete-set-owners">{t.owners(blocker.count)}</li>;
    case "welcome":
      return (
        <li data-testid="delete-set-welcome">
          {t.welcome}
          {link("#welcome", t.welcomeLink)}
        </li>
      );
    case "cover_cards":
      return (
        <li data-testid="delete-set-cover">
          {t.coverCards(blocker.count)}
          {link("/admin/settings#cover-cards", t.coverLink)}
        </li>
      );
    case "tier_rule":
      return (
        <li data-testid="delete-set-tier">
          {t.tierRule(blocker.name)}
          {link("/admin/tiers", t.tierLink)}
        </li>
      );
  }
}
