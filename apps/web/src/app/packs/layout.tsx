import { headers } from "next/headers";
import { requireUser } from "@/server/auth/require-user";
import { UserHeader } from "@/features/user/UserHeader";
import { getDict } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.packs.meta.myPacks };
}

export default async function SobresLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/packs";
  const user = await requireUser(path);
  return (
    <div className="min-h-dvh bg-ui-bg text-ui-text">
      <UserHeader name={user.displayName} isAdmin={user.role === "admin"} />
      {children}
    </div>
  );
}
