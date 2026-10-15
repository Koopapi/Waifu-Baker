import Link from "next/link";
import { db } from "@/db/client";
import { searchUsers } from "@/server/services/users-admin";
import { inputCls } from "@/features/admin/ui";

/** RF-27: búsqueda de usuarios por nombre o id de Patreon. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await searchUsers(db, q);
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <form className="flex gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Nombre o id de Patreon" className={inputCls} aria-label="Buscar usuarios" />
        <button className="rounded-full bg-[#d6b370] px-5 text-sm font-semibold text-[#0b0c0e]">Buscar</button>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-white/50">{q ? `Ningún usuario coincide con «${q}».` : "Aún no hay usuarios."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Patreon</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Edad verificada</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="underline decoration-white/20 underline-offset-4 hover:decoration-white">
                      {u.displayName || "Sin nombre"}
                    </Link>
                    {u.deletedAt && <span className="ml-2 text-xs text-red-300">borrada</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60">{u.patreonUserId}</td>
                  <td className="px-4 py-3">{u.role === "admin" ? "Administrador" : "Usuario"}</td>
                  <td className="px-4 py-3">{u.isAdultDeclared && u.adultVerifiedAt ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 text-white/60">{u.createdAt.toLocaleDateString("es")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
