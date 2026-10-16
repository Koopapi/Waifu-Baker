import { cookies } from "next/headers";
import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getDict } from "@/i18n/server";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { cardImageUrl } from "@/server/cards/image-urls";
import { now } from "@/server/clock";
import { shellSummary } from "@/server/services/shell";
import { AppShell, type NavItem } from "./AppShell";
import { DemoBanner, demoRoleOf } from "@/features/demo/DemoBanner";

/** Iniciales para el icono de una colección sin portada: «Fan Art Vol. 1» → «FA». */
export function initials(name: string) {
  const [a = "?", b] = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return (b ? a.slice(0, 1) + b.slice(0, 1) : a.slice(0, 2)).toUpperCase();
}

/**
 * Spec 010: la estructura del coleccionista con sus datos (colecciones, contadores y usuario). Recibe solo el id: los datos del usuario se leen aquí y no viajan como props (en desarrollo, React
 * incluye las props de los componentes de servidor en la página).
 */
export async function CollectorShell({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [user] = await db.select({ id: users.id, displayName: users.displayName, role: users.role, patreonUserId: users.patreonUserId }).from(users).where(eq(users.id, userId));
  const demoRole = demoRoleOf(user.patreonUserId);
  const [t, jar] = await Promise.all([getDict(), cookies()]);
  const s = await shellSummary(db, user.id, { now: now(), timeZone: jar.get("wb_tz")?.value ?? null });
  const sh = t.common.shell;
  const packs: NavItem = { href: "/sobres", label: t.common.nav.myPacks, icon: "packs", badge: s.sealed };
  const collection: NavItem = { href: "/coleccion", label: t.common.nav.myCollection, icon: "collection" };
  const rewards: NavItem = { href: "/recompensas", label: sh.rewards, icon: "rewards", badge: s.rewardsReady };
  const account: NavItem = { href: "/cuenta", label: t.common.nav.myAccount, icon: "account" };

  return (
    <AppShell
      kind="collector"
      banner={demoRole && <DemoBanner role={demoRole} />}
      header={{ title: t.common.brand, subtitle: s.collections.length ? sh.collections : sh.noCollections }}
      emptyRail={sh.noCollections}
      rail={s.collections.map((c) => ({
        href: `/coleccion/${c.setId}`,
        label: `${c.name} · ${c.locked ? sh.lockedSet : sh.progress(c.progress.owned, c.progress.total)}`,
        initials: initials(c.name),
        image: c.coverCardId ? cardImageUrl(c.coverCardId, "thumb", user.id) : null,
        badge: c.sealed || undefined,
      }))}
      railExtra={{ href: "/drop-rates", label: t.common.nav.odds, icon: "odds" }}
      groups={[
        { label: sh.groups.collection, items: [packs, collection, { href: "/coleccion/album", label: sh.album, icon: "album" }, rewards] },
        {
          label: sh.groups.you,
          items: [
            account,
            { href: "/drop-rates", label: t.common.nav.odds, icon: "odds" },
            ...(user.role === "admin" ? [{ href: "/admin", label: t.common.nav.panel, icon: "admin" as const }] : []),
          ],
        },
      ]}
      tabs={[
        { ...packs, label: sh.tabs.packs },
        { ...collection, label: sh.tabs.collection },
        { ...rewards, label: sh.tabs.rewards },
        { ...account, label: sh.tabs.account },
      ]}
      user={{ name: user.displayName || "—", detail: sh.cookies(s.cookies) }}
      userActions={<SignOutButton label={t.common.nav.signOut} />}
      topActions={<LocaleToggle />}
    >
      {children}
    </AppShell>
  );
}

export function SignOutButton({ label }: { label: string }) {
  return (
    <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
      <button aria-label={label} title={label} className="rounded p-1.5 text-ui-text-2 hover:bg-ui-hover hover:text-ui-text">
        <LogOut className="size-[18px]" aria-hidden />
      </button>
    </form>
  );
}
