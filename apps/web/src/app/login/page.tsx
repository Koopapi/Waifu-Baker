import { redirect } from "next/navigation";
import { auth, devLoginEnabled, patreonLoginEnabled, signIn } from "@/auth";
import { LocaleToggle } from "@/i18n/LocaleToggle";
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
    <main className="min-h-dvh grid place-items-center bg-[#0b0912] text-[#f1eef8] px-4">
      <LocaleToggle className="fixed right-4 top-4 z-50" />
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-xl font-bold">{t.site.login.title}</h1>
        {patreonLoginEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("patreon", { redirectTo: target });
            }}
          >
            <button className="w-full rounded-full bg-[#f96854] py-3 font-semibold text-white">{t.site.login.withPatreon}</button>
          </form>
        )}
        {!patreonLoginEnabled && <p className="text-sm text-white/60">{t.site.login.patreonMissing}</p>}
        {devLoginEnabled && (
          <form
            className="space-y-3 border-t border-white/10 pt-5"
            action={async (fd: FormData) => {
              "use server";
              await signIn("dev", { name: fd.get("name"), admin: fd.get("admin"), redirectTo: target });
            }}
          >
            <p className="text-xs uppercase tracking-wider text-white/50">{t.site.login.devLogin}</p>
            <input name="name" required placeholder={t.site.login.namePlaceholder} className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="admin" defaultChecked /> {t.site.login.asAdmin}
            </label>
            <button className="w-full rounded-full bg-[#d6b370] py-2.5 font-semibold text-[#0b0c0e]">{t.site.login.devSubmit}</button>
          </form>
        )}
      </div>
    </main>
  );
}
