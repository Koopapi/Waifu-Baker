import { headers } from "next/headers";
import { getDict } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { UserHeader } from "@/features/user/UserHeader";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.account.title };
}

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/cuenta";
  const user = await requireUser(path);
  return (
    <div className="min-h-dvh bg-[#0b0912] text-[#f1eef8]">
      <UserHeader name={user.displayName} isAdmin={user.role === "admin"} />
      {children}
    </div>
  );
}
