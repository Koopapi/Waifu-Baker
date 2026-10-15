"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md space-y-5">
        <h1 className="text-3xl font-bold">Algo ha fallado</h1>
        <p className="text-white/60">No es culpa tuya. Tus sobres y tus cartas están a salvo: inténtalo de nuevo en un momento.</p>
        {error.digest && <p className="font-mono text-xs text-white/30">Código: {error.digest}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-full bg-[#d6b370] px-6 py-3 font-semibold text-[#0b0c0e]">
            Reintentar
          </button>
          <Link href="/" className="rounded-full border border-white/20 px-6 py-3">
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
