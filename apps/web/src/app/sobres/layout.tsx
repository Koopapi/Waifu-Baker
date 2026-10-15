import Link from "next/link";
import { headers } from "next/headers";
import { signOut } from "@/auth";
import { requireUser } from "@/server/auth/require-user";

export const metadata = { title: "Mis sobres · Waifu Baker" };

export default async function SobresLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "/sobres";
  const user = await requireUser(path);
  return (
    <div className="min-h-dvh bg-[#0b0912] text-[#f1eef8]">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <Link href="/" className="font-extrabold tracking-[0.14em]">
          WAIFU BAKER
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/sobres" className="text-white/80 hover:text-white">
            Mis sobres
          </Link>
          <Link href="/drop-rates" className="text-white/60 hover:text-white">
            Probabilidades
          </Link>
          {user.role === "admin" && (
            <Link href="/admin" className="text-white/60 hover:text-white">
              Panel
            </Link>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-white/50 hover:text-white" title={user.displayName}>
              Salir
            </button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
