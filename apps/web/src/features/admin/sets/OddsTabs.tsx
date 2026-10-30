"use client";

import { useEffect, useState } from "react";
import type { PackKind } from "@/domain/catalog/default-odds";
import { useT } from "@/i18n/client";
import { Tabs } from "@/ui/content/Tabs";

const kindOfHash = (hash: string): PackKind | null => (hash.includes("gold") ? "gold" : hash.startsWith("#ranura-") || hash === "#probabilidades" ? "silver" : null);

/**
 * Spec 022, RF-21: las tablas del sobre plata y del gold en pestañas. Los enlaces de los problemas al publicar
 * (`#ranura-gold-2`, `#probabilidades-gold`…) abren la pestaña que toca y llevan hasta la fila.
 */
export function OddsTabs({ silver, gold }: { silver: React.ReactNode; gold: React.ReactNode }) {
  const t = useT();
  const [tab, setTab] = useState<PackKind>("silver");
  useEffect(() => {
    const follow = () => {
      const kind = kindOfHash(window.location.hash);
      if (!kind) return;
      setTab(kind);
      requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView({ block: "center" }));
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);
  return (
    <Tabs
      label={t.admin.odds.tabsAria}
      value={tab}
      onValueChange={(v) => setTab(v as PackKind)}
      items={[
        { value: "silver", label: t.common.packKind.silver, content: silver },
        { value: "gold", label: t.common.packKind.gold, content: gold },
      ]}
    />
  );
}
