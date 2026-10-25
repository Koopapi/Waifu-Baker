import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getDict } from "@/i18n/server";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { listSets } from "@/server/services/collections";
import { AppShell } from "@/ui/shell/AppShell";
import { SignOutButton } from "./CollectorShell";
import { DemoBanner, demoRoleOf } from "@/features/demo/DemoBanner";

/** Spec 010, RF-5: el panel de administración con la misma estructura; la barra lista las colecciones. */
/** Recibe solo el id, como `CollectorShell`. */
export async function AdminShell({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [t, list, [me]] = await Promise.all([
    getDict(),
    listSets(db),
    db.select({ displayName: users.displayName, patreonUserId: users.patreonUserId }).from(users).where(eq(users.id, userId)),
  ]);
  const demoRole = demoRoleOf(me?.patreonUserId);
  const name = me?.displayName || "Admin";
  const n = t.admin.nav;
  const sh = t.common.shell;
  return (
    <AppShell
      kind="admin"
      banner={demoRole && <DemoBanner role={demoRole} />}
      header={{ title: sh.adminTitle, subtitle: sh.adminSubtitle }}
      rail={list.map((s) => ({
        href: `/admin/sets/${s.id}`,
        label: `${s.code} · ${s.name} · ${t.admin.status[s.status]}`,
        initials: s.code.length <= 3 ? s.code : s.code.replace(/^[A-Z]{2}/, "").slice(0, 3),
      }))}
      railExtra={{ href: "/admin/sets", label: sh.newSet, icon: "plus" }}
      groups={[
        {
          label: sh.groups.operation,
          items: [
            { href: "/admin", label: n.overview, icon: "overview", exact: true },
            { href: "/admin/metricas", label: n.metrics, icon: "metrics" },
          ],
        },
        {
          label: sh.groups.catalog,
          items: [
            { href: "/admin/sets", label: n.sets, icon: "sets" },
            { href: "/admin/characters", label: n.characters, icon: "characters" },
            { href: "/admin/library", label: n.library, icon: "library" },
            { href: "/admin/expediciones", label: n.expeditions, icon: "expeditions" },
          ],
        },
        {
          label: sh.groups.players,
          items: [
            { href: "/admin/users", label: n.users, icon: "users" },
            { href: "/admin/albumes", label: n.albums, icon: "album" },
            { href: "/admin/tiers", label: n.tiers, icon: "tiers" },
          ],
        },
        {
          label: sh.groups.system,
          items: [
            { href: "/admin/ajustes", label: n.settings, icon: "settings" },
            { href: "/sobres", label: sh.collectorView, icon: "packs" },
            { href: "/drop-rates", label: n.publicOdds, icon: "odds", external: true },
          ],
        },
      ]}
      user={{ name, detail: sh.adminRole }}
      userActions={<SignOutButton label={t.admin.layout.signOut} />}
      topActions={<LocaleToggle />}
    >
      {children}
    </AppShell>
  );
}
