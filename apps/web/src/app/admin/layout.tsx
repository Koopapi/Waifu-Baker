import { headers } from "next/headers";
import { requireAdmin } from "@/server/auth/require-admin";
import { AdminShell } from "@/features/shell/AdminShell";
import { getDict } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.admin.metaTitle };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/admin";
  const session = await requireAdmin(path);
  return (
    <AdminShell userId={session.user.id}>
      <main className="min-w-0 p-4 md:p-6">{children}</main>
    </AdminShell>
  );
}
