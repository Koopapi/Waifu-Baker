import { headers } from "next/headers";
import { requireUser } from "@/server/auth/require-user";
import { UserHeader } from "@/features/user/UserHeader";

export const metadata = { title: "Mis sobres" };

export default async function SobresLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/sobres";
  const user = await requireUser(path);
  return (
    <div className="min-h-dvh bg-[#0b0912] text-[#f1eef8]">
      <UserHeader name={user.displayName} isAdmin={user.role === "admin"} />
      {children}
    </div>
  );
}
