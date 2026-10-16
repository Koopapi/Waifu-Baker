import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { needsAcceptance, safeNext } from "@/domain/legal/documents";
import { LocaleToggle } from "@/i18n/LocaleToggle";
import { getDict } from "@/i18n/server";
import { GateForm } from "@/features/legal/GateForm";
import { getMinAge } from "@/server/services/settings";

export async function generateMetadata() {
  return { title: (await getDict()).legal.gate.title };
}

/** Spec 007, RF-1 a RF-3: confirmar la edad y aceptar los términos antes de usar la web. */
export default async function BienvenidaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const id = (await auth())?.user?.id;
  if (!id) redirect(`/login?next=${encodeURIComponent(`/bienvenida?next=${next}`)}`);
  const [[u], minAge] = await Promise.all([db.select().from(users).where(eq(users.id, id)), getMinAge(db)]);
  if (u && !needsAcceptance(u, undefined, minAge)) redirect(next);
  // Spec 010, RF-18: ya aceptó, pero confirmó una edad menor que la vigente.
  const ageRaised = Boolean(u?.ageConfirmedAt && (u.ageConfirmedMin ?? 16) < minAge);
  const t = (await getDict()).legal.gate;
  return (
    <main className="grid min-h-dvh place-items-center bg-ui-bg px-4 text-ui-text">
      <LocaleToggle className="fixed right-4 top-4" />
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-ui-line bg-ui-raised p-6">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ui-text-2">{ageRaised ? t.ageRaised(minAge) : u?.ageConfirmedAt ? t.updated : t.intro}</p>
        <GateForm next={next} minAge={minAge} />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="w-full text-sm text-ui-text-3 hover:text-white">{t.signOut}</button>
        </form>
      </div>
    </main>
  );
}
