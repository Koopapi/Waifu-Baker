import { FlaskConical, Repeat } from "lucide-react";
import { enterDemoAction } from "@/app/demo/actions";
import { DEMO_USERS, isDemoEnabled, type DemoRole } from "@/domain/demo/mode";
import { getDict } from "@/i18n/server";

/** El papel de la demo de un usuario, o null si no es un usuario de la demo (o no hay demo). */
export function demoRoleOf(patreonUserId: string | null | undefined): DemoRole | null {
  if (!isDemoEnabled(process.env)) return null;
  const hit = Object.entries(DEMO_USERS).find(([, u]) => patreonUserId === `dev:${u.name}`);
  return (hit?.[0] as DemoRole) ?? null;
}

/** Spec 010, RF-14: franja que indica el modo demo, con el cambio de papel. */
export async function DemoBanner({ role }: { role: DemoRole }) {
  const t = (await getDict()).site.demo;
  const other: DemoRole = role === "admin" ? "collector" : "admin";
  return (
    <div className="flex h-[34px] items-center justify-center gap-3 overflow-hidden bg-ui-accent px-3 text-[13px] font-medium text-ui-on-accent" data-testid="demo-banner">
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline">{t.banner(role)}</span>
      <span className="sm:hidden">{t.bannerShort(t.roles[role])}</span>
      <form action={enterDemoAction.bind(null, other)}>
        <button className="btn shrink-0 rounded border border-white/80 px-2.5 py-0.5 text-xs hover:bg-white/15" data-testid="demo-switch">
          <Repeat className="size-3.5" aria-hidden />
          {t.switchTo(t.roles[other])}
        </button>
      </form>
    </div>
  );
}
