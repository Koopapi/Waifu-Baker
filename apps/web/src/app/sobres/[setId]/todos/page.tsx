import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { packs, sets } from "@/db/schema";
import { requireUser } from "@/server/auth/require-user";
import { getDict } from "@/i18n/server";
import { OpenAllView } from "@/features/packs/OpenAllView";
import { packArtForSets } from "@/server/services/pack-art";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.packs.meta.openAll };
}

export default async function OpenAllPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  if (!z.string().uuid().safeParse(setId).success) notFound();
  const user = await requireUser(`/sobres/${setId}/todos`);
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) notFound();
  const [{ n }] = await db
    .select({ n: count() })
    .from(packs)
    .where(and(eq(packs.userId, user.id), eq(packs.setId, setId), eq(packs.status, "sealed")));
  const art = (await packArtForSets(db, [set.id])).get(set.id) ?? { coverVersion: null, packImage: null };
  return <OpenAllView setId={set.id} setCode={set.code} setName={set.name} art={art} sealed={Math.min(n, 50)} />;
}
