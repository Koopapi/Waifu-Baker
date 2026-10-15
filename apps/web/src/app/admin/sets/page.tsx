import Link from "next/link";
import { db } from "@/db/client";
import { listSets } from "@/server/services/collections";
import { AdultBadge, StatusBadge } from "@/features/admin/ui";
import { getDict } from "@/i18n/server";
import { CreateSetForm } from "./forms";

export default async function SetsPage() {
  const rows = await listSets(db);
  const t = (await getDict()).admin.sets;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <CreateSetForm />
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">{t.th.code}</th>
                <th className="px-4 py-3">{t.th.name}</th>
                <th className="px-4 py-3">{t.th.type}</th>
                <th className="px-4 py-3">{t.th.status}</th>
                <th className="px-4 py-3 text-right">{t.th.cards}</th>
                <th className="px-4 py-3 text-right">{t.th.perPack}</th>
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
