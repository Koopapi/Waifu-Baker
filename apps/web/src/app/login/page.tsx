import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, devLoginEnabled, patreonLoginEnabled, signIn } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { Button } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { Checkbox } from "@/ui/form/Choice";
import { TextField } from "@/ui/form/TextField";
import { getDict } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.site.login.title };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/sobres";
  const session = await auth();
  if (session?.user?.id) redirect(target);
  const t = await getDict();

  return (
    <main className="min-h-dvh grid place-items-center bg-ui-bg text-ui-text px-4">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <Card as="div" className="w-full max-w-sm space-y-6 p-6">
        <h1 className="text-xl font-bold">{t.site.login.title}</h1>
        {patreonLoginEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("patreon", { redirectTo: target });
            }}
          >
            <Button type="submit" variant="patreon" size="lg" width="full">
              {t.site.login.withPatreon}
            </Button>
          </form>
        )}
        {!patreonLoginEnabled && <p className="text-sm text-ui-text-2">{t.site.login.patreonMissing}</p>}
        {devLoginEnabled && (
          <form
            className="space-y-3 border-t border-ui-line pt-5"
            action={async (fd: FormData) => {
              "use server";
              await signIn("dev", { name: fd.get("name"), admin: fd.get("admin"), redirectTo: target });
            }}
          >
            <p className="text-xs uppercase tracking-wider text-ui-text-3">{t.site.login.devLogin}</p>
            <TextField name="name" required label={t.site.login.namePlaceholder} hideLabel placeholder={t.site.login.namePlaceholder} />
            <Checkbox name="admin" defaultChecked label={t.site.login.asAdmin} />
            <Button type="submit" width="full">
              {t.site.login.devSubmit}
            </Button>
          </form>
        )}
        {/* Spec 024: el equipo (administradores) entra con usuario, contraseña y Telegram. */}
        <Link href="/login/equipo" className="block border-t border-ui-line pt-4 text-center text-xs text-ui-text-3 underline-offset-4 hover:underline">
          {t.site.login.staffLink}
        </Link>
      </Card>
    </main>
  );
}
