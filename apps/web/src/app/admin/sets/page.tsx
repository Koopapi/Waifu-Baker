import Link from "next/link";
import { db } from "@/db/client";
import { listSets } from "@/server/services/collections";
import { AdultBadge, StatusBadge } from "@/features/admin/ui";
import { CreateSetForm } from "./forms";

export default async function SetsPage() {
  const rows = await listSets(db);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Colecciones</h1>
      <CreateSetForm />
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">Aún no hay colecciones. Crea la primera con el formulario de arriba.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Cartas</th>
                <th className="px-4 py-3 text-right">Por sobre</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono">
                    <Link className="underline decoration-white/20 underline-offset-4 hover:decoration-white" href={`/admin/sets/${r.id}`}>
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">
                    <AdultBadge adult={r.isAdult} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.cardCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.packSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
