import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(120%_80%_at_50%_15%,#2a1350_0%,#0b0912_60%)] px-6 text-center">
      <div className="max-w-md space-y-5">
        <p className="font-mono text-sm tracking-[0.3em] text-white/40">404</p>
        <h1 className="text-3xl font-bold">Esta página no existe</h1>
        <p className="text-white/60">Puede que el enlace haya cambiado o que el álbum ya no sea público.</p>
        <Link href="/" className="inline-block rounded-full bg-[#d6b370] px-6 py-3 font-semibold text-[#0b0c0e]">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
