"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveSetAction, publishSetAction } from "@/app/admin/sets/actions";
import type { Problem } from "@/domain/catalog/odds";

const anchor = (p: Problem) =>
  p.target.kind === "card"
    ? `#carta-${String(p.target.number).padStart(3, "0")}`
    : p.target.kind === "slot"
      ? `#ranura-${p.target.index + 1}`
      : p.target.kind === "rarity"
        ? "#probabilidades"
        : null;

/** RF-6/RF-7: publicar con lista de problemas enlazados. RF-9: archivar una publicada. */
export function PublishPanel({ setId, version, status }: { setId: string; version: number; status: "draft" | "published" | "archived" }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (status === "archived") {
    return <p className="text-sm text-white/50">Colección archivada: no se concede en sobres nuevos; lo obtenido y los sobres sin abrir se conservan.</p>;
  }

  return (
    <div className="space-y-3" data-testid="publish-panel">
      {status === "draft" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await publishSetAction(setId, version);
              setProblems(r.problems ?? []);
              setMsg({ ok: r.ok, text: r.error ?? r.message ?? "" });
              if (r.ok) router.refresh();
            })
          }
          className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {pending ? "Comprobando…" : "Comprobar y publicar"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (!window.confirm("¿Archivar la colección? Dejará de concederse en sobres nuevos.")) return;
              const r = await archiveSetAction(setId, version);
              setMsg({ ok: r.ok, text: r.error ?? r.message ?? "" });
              if (r.ok) router.refresh();
            })
          }
          className="rounded-full border border-white/20 px-5 py-2 text-sm disabled:opacity-60"
        >
          Archivar colección
        </button>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
      {problems.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-sm" data-testid="publish-problems">
          {problems.map((p, i) => {
            const href = anchor(p);
            return (
              <li key={i} className="flex gap-2">
                <span className="text-red-300">•</span>
                {href ? (
                  <a href={href} className="underline decoration-white/20 underline-offset-4 hover:decoration-white">
                    {p.message}
                  </a>
                ) : (
                  <span>{p.message}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
