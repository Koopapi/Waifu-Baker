import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { cards } from "@/db/schema";
import { PACK_KINDS, type PackKind } from "@/domain/catalog/default-odds";
import { PACK_SAMPLE_CARD } from "@/domain/packs/example";
import { PackDesigner } from "@/features/admin/packs/PackDesigner";
import type { SampleCard } from "@/features/admin/packs/DesignerStage";
import { adminPacksDictionaries } from "@/i18n/admin-packs";
import { getDict, getLocale } from "@/i18n/server";
import { getSet } from "@/server/services/collections";
import { getPackDesign } from "@/server/services/pack-designs";

type Params = { params: Promise<{ id: string; kind: string }> };

const parse = (kind: string): PackKind | null => ((PACK_KINDS as readonly string[]).includes(kind) ? (kind as PackKind) : null);

export async function generateMetadata({ params }: Params) {
  const { id, kind } = await params;
  const k = parse(kind);
  const set = k && z.string().uuid().safeParse(id).success ? await getSet(db, id) : null;
  if (!set || !k) return {};
  const [t, locale] = await Promise.all([getDict(), getLocale()]);
  return { title: adminPacksDictionaries[locale].meta(set.code, t.common.packKind[k]) };
}

/** Spec 030, RF-1: el editor del sobre plata o gold de una colección (solo administradores: lo protege el panel, RF-13). */
export default async function PackDesignPage({ params }: Params) {
  const { id, kind: raw } = await params;
  const kind = parse(raw);
  if (!kind || !z.string().uuid().safeParse(id).success) notFound();
  const set = await getSet(db, id);
  if (!set) notFound();
  const [row, list, t] = await Promise.all([
    getPackDesign(db, set.id, kind),
    db.select({ name: cards.name, rarity: cards.rarity, keyMid: cards.keyMid }).from(cards).where(eq(cards.setId, set.id)).orderBy(asc(cards.number)),
    getDict(),
  ]);
  // RF-3: las cartas de muestra de «Probar apertura» son las de la colección (o, sin cartas, la del paquete de Bruno).
  const own: SampleCard[] = list.filter((c) => c.keyMid && c.rarity).map((c) => ({ image: `/api/admin/assets/${c.keyMid}`, rarity: c.rarity!, name: c.name || set.code }));
  const samples: SampleCard[] = own.length > 0 ? own.slice(0, 15) : (["common", "rare", "rare", "epic", "legendary"] as const).map((rarity) => ({ image: `/api/admin/pack-example/${PACK_SAMPLE_CARD}`, rarity, name: "Yuki", raw: true }));
  return (
    <PackDesigner
      key={`${set.id}-${kind}`}
      set={{ id: set.id, code: set.code, name: set.name, packSize: set.packSize }}
      kind={kind}
      kindLabel={t.common.packKind[kind]}
      initial={row?.design ?? null}
      savedAt={row?.updatedAt.toISOString() ?? null}
      samples={samples}
    />
  );
}
