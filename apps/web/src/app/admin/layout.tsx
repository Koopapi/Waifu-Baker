import { headers } from "next/headers";
import { signOut } from "@/auth";
import { requireAdmin } from "@/server/auth/require-admin";
import { NavLinks } from "@/features/admin/NavLinks";
import { getDict } from "@/i18n/server";
import { LocaleToggle } from "@/i18n/LocaleToggle";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.admin.metaTitle };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/admin";
  const session = await requireAdmin(path);
  const t = await getDict();

  return (
    <div className="min-h-dvh bg-[#0f0d16] text-[#ece9f5] md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
        <div className="mb-6 font-extrabold tracking-wide">{t.admin.layout.title}</div>
        <NavLinks />
        <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/50">
          <p className="mb-2">{session.user.name}</p>
          <LocaleToggle className="mb-3" />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="underline">{t.admin.layout.signOut}</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-6">{children}</main>
    </div>
  );
}
