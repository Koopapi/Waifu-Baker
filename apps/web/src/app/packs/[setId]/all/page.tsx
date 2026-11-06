import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { packs, sets } from "@/db/schema";
import { requireUser } from "@/server/auth/require-user";
import { getDict } from "@/i18n/server";
import { OpenAllView } from "@/features/packs/OpenAllView";
import { packViewFor } from "@/server/services/pack-designs";
import { parsePackKind } from "@/domain/catalog/default-odds";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.packs.meta.openAll };
}

export default async function OpenAllPage({ params, searchParams }: { params: Promise<{ setId: string }>; searchParams: Promise<{ k?: string }> }) {
  const { setId } = await params;
  // Spec 022, RF-19: «Abrir todos» de un tipo de sobre (plata si no se indica).
  const kind = parsePackKind((await searchParams).k);
  if (!z.string().uuid().safeParse(setId).success) notFound();
  const user = await requireUser(`/packs/${setId}/all`);
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) notFound();
  const [{ n }] = await db
    .select({ n: count() })
    .from(packs)
    .where(and(eq(packs.userId, user.id), eq(packs.setId, setId), eq(packs.kind, kind), eq(packs.status, "sealed")));
  // Spec 030, RF-16: el sobre de la colección y tipo (su diseño o el básico).
  const view = (await packViewFor(db, user.id, set.id, kind))!;
  return <OpenAllView setId={set.id} setName={set.name} view={view} kind={kind} sealed={Math.min(n, 50)} />;
}
