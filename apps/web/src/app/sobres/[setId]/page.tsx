import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { packs, sets } from "@/db/schema";
import { requireUser } from "@/server/auth/require-user";
import { getDict } from "@/i18n/server";
import { PackOpener } from "@/features/packs/PackOpener";
import { packArtForSets } from "@/server/services/pack-art";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.packs.meta.openPack };
}

/** RF-16 y RF-17: apertura real con la escena del laboratorio; `?pack=` reanuda una sin terminar. */
export default async function OpenPackPage({ params, searchParams }: { params: Promise<{ setId: string }>; searchParams: Promise<{ pack?: string }> }) {
  const { setId } = await params;
  const { pack } = await searchParams;
  if (!z.string().uuid().safeParse(setId).success) notFound();
  const user = await requireUser(`/sobres/${setId}`);
  const [set] = await db.select().from(sets).where(eq(sets.id, setId));
  if (!set) notFound();
  const [{ n }] = await db
    .select({ n: count() })
    .from(packs)
    .where(and(eq(packs.userId, user.id), eq(packs.setId, setId), eq(packs.status, "sealed")));
  const resume = pack && z.string().uuid().safeParse(pack).success ? pack : null;
  const art = (await packArtForSets(db, [set.id])).get(set.id) ?? { coverVersion: null, packImage: null };
  return <PackOpener setId={set.id} setCode={set.code} setName={set.name} art={art} sealed={n} resumePackId={resume} />;
}
