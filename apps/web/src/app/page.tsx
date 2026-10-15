import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_15%,#2a1350_0%,#0b0912_60%)] px-6 text-[#f1eef8]">
      <div className="max-w-xl space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-[0.18em] sm:text-5xl">WAIFU BAKER</h1>
          <p className="text-lg text-white/70">Cartas coleccionables de ilustración anime. Abre sobres, colecciona tus favoritas y completa cada colección.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={session?.user?.id ? "/sobres" : "/login?next=/sobres"} className="rounded-full bg-[#d6b370] px-6 py-3 font-semibold text-[#0b0c0e]">
            {session?.user?.id ? "Mis sobres" : "Entrar"}
          </Link>
          {session?.user?.id && (
            <Link href="/coleccion" className="rounded-full border border-white/20 px-6 py-3">
              Mi colección
            </Link>
          )}
          <Link href="/drop-rates" className="rounded-full border border-white/20 px-6 py-3">
            Probabilidades
          </Link>
        </div>
        <p className="text-xs text-white/40">Ilustraciones generadas con IA. Las cartas son digitales, sin valor monetario y no intercambiables.</p>
      </div>
    </main>
  );
}
