import { redirect } from "next/navigation";
import { auth, devLoginEnabled, patreonLoginEnabled, signIn } from "@/auth";

export const metadata = { title: "Entrar · Waifu Baker" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/sobres";
  const session = await auth();
  if (session?.user?.id) redirect(target);

  return (
    <main className="min-h-dvh grid place-items-center bg-[#0b0912] text-[#f1eef8] px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-xl font-bold">Entrar</h1>
        {patreonLoginEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("patreon", { redirectTo: target });
            }}
          >
            <button className="w-full rounded-full bg-[#f96854] py-3 font-semibold text-white">Entrar con Patreon</button>
          </form>
        )}
        {!patreonLoginEnabled && <p className="text-sm text-white/60">Patreon aún no está configurado (faltan AUTH_PATREON_ID y AUTH_PATREON_SECRET).</p>}
        {devLoginEnabled && (
          <form
            className="space-y-3 border-t border-white/10 pt-5"
            action={async (fd: FormData) => {
              "use server";
              await signIn("dev", { name: fd.get("name"), admin: fd.get("admin"), redirectTo: target });
            }}
          >
            <p className="text-xs uppercase tracking-wider text-white/50">Login de desarrollo</p>
            <input name="name" required placeholder="Nombre" className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="admin" defaultChecked /> Entrar como administrador
            </label>
            <button className="w-full rounded-full bg-[#d6b370] py-2.5 font-semibold text-[#0b0c0e]">Entrar (desarrollo)</button>
          </form>
        )}
      </div>
    </main>
  );
}
