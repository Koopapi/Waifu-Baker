import { db } from "@/db/client";
import { RARITIES, RARITY_LABEL } from "@/domain/catalog/card-rules";
import { listPublicOdds } from "@/server/services/collections";

export const metadata = { title: "Probabilidades", description: "Probabilidades publicadas de cada colección." };
// Dinámica: así la compilación no necesita la BD y lo publicado se ve al momento.
export const dynamic = "force-dynamic";

const pct = (x: number) => `${x.toLocaleString("es", { maximumFractionDigits: 2 })} %`;

/** RF-21: probabilidades públicas, congeladas al publicar cada colección. */
export default async function DropRatesPage() {
  const rows = await listPublicOdds(db);
  return (
    <main className="min-h-dvh bg-[#0b0912] px-4 py-12 text-[#f1eef8]">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">Probabilidades de los sobres</h1>
          <p className="text-white/70">
            Cada sobre tiene varias ranuras. En cada ranura sale una carta, y la rareza se sortea con los porcentajes de su fila. Dentro de una rareza,
            todas las cartas tienen la misma probabilidad. Estas tablas se fijan al publicar la colección y no cambian después. Las cartas no tienen valor
            monetario ni se pueden intercambiar. Las ilustraciones de las cartas están generadas con IA.
          </p>
        </header>
        {rows.length === 0 && <p className="text-white/50">Aún no hay colecciones publicadas.</p>}
        {rows.map(({ set, odds }) => (
          <section key={set.id} className="space-y-3">
            <h2 className="text-xl font-semibold">
              {set.name} <span className="font-mono text-sm text-white/50">{set.code}</span>
            </h2>
            <p className="text-sm text-white/50">
              Publicada el {odds.publishedAt?.toLocaleDateString("es", { dateStyle: "long" })} · versión {odds.version} · {set.packSize} cartas por sobre ·
              holo en Rara o superior: {pct(odds.holoChance * 100)}
            </p>
            <p className="text-sm text-white/70" data-testid={`pity-${set.code}`}>
              {odds.pityThreshold > 0
                ? `Protección de mala suerte: si abres ${odds.pityThreshold - 1} sobres seguidos de esta colección sin ninguna carta Épica o superior, el siguiente trae al menos una (sustituye a la carta de la última ranura). El contador es tuyo y de esta colección.`
                : "Esta colección no tiene protección de mala suerte."}
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Ranura</th>
                    {RARITIES.map((r) => (
                      <th key={r} className="px-3 py-2 text-right">
                        {RARITY_LABEL[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {odds.slots.map((s, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-3 py-2">{i + 1}</td>
                      {RARITIES.map((r) => (
                        <td key={r} className="px-3 py-2 text-right tabular-nums">
                          {s[r] ? pct(s[r]) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
