import { FlaskConical, Repeat } from "@/ui/icons/glyphs";
import { enterDemoAction } from "@/app/demo/actions";
import { DEMO_USERS, isDemoEnabled, type DemoRole } from "@/domain/demo/mode";
import { getDict } from "@/i18n/server";
import { Banner } from "@/ui/shell/Banner";
import { Button } from "@/ui/action/Button";

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
    <Banner
      data-testid="demo-banner"
      icon={<FlaskConical className="size-4 shrink-0" aria-hidden />}
      action={
        <form action={enterDemoAction.bind(null, other)}>
          <Button type="submit" size="xs" variant="onAccent" className="shrink-0" icon={<Repeat className="size-3.5" aria-hidden />} data-testid="demo-switch">
            {t.switchTo(t.roles[other])}
          </Button>
        </form>
      }
    >
      <span className="hidden sm:inline">{t.banner(role)}</span>
      <span className="sm:hidden">{t.bannerShort(t.roles[role])}</span>
    </Banner>
  );
}
