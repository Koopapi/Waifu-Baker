import { headers } from "next/headers";
import { getDict } from "@/i18n/server";
import { requireUser } from "@/server/auth/require-user";
import { UserHeader } from "@/features/user/UserHeader";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.collection.title };
}

export default async function ColeccionLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/coleccion";
  const user = await requireUser(path);
  return (
    <div className="min-h-dvh bg-[#0b0912] text-[#f1eef8]">
      <UserHeader name={user.displayName} isAdmin={user.role === "admin"} />
      {children}
    </div>
  );
}
