import Link from "next/link";
import { signOut } from "@/auth";

/** Cabecera de las páginas del coleccionista. */
export function UserHeader({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
      <Link href="/" className="font-extrabold tracking-[0.14em]">
        WAIFU BAKER
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm">
        <Link href="/sobres" className="text-white/80 hover:text-white">
          Mis sobres
        </Link>
        <Link href="/coleccion" className="text-white/80 hover:text-white">
          Mi colección
        </Link>
        <Link href="/drop-rates" className="text-white/60 hover:text-white">
          Probabilidades
        </Link>
        {isAdmin && (
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
          <button className="text-white/50 hover:text-white" title={name}>
            Salir
          </button>
        </form>
      </nav>
    </header>
  );
}
