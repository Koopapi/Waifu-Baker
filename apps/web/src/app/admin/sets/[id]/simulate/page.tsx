import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { getSet } from "@/server/services/collections";
import { SimulateStage } from "@/features/admin/sets/SimulateStage";
import { getDict } from "@/i18n/server";
import { parsePackKind } from "@/domain/catalog/default-odds";
import { packViewFor } from "@/server/services/pack-designs";
import { requireAdmin } from "@/server/auth/require-admin";

export async function generateMetadata() {
  const t = await getDict();
  return { title: t.admin.simulate.metaTitle };
}

/** RF-23: apertura completa con las cartas y probabilidades reales de la colección. Spec 022, RF-21: por tipo (`?k=gold`). */
export default async function SimulatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const { id } = await params;
  const kind = parsePackKind((await searchParams).k);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const set = await getSet(db, id);
  if (!set) notFound();
  const t = await getDict();
  // Spec 030, RF-16: el mismo sobre que verá el coleccionista (con enlaces firmados para el administrador).
  const admin = await requireAdmin(`/admin/sets/${id}/simulate`);
  const view = (await packViewFor(db, admin.user.id, set.id, kind))!;
  return <SimulateStage setId={set.id} kind={kind} view={view} label={t.admin.simulate.packLabel(set.code, t.common.packKind[kind])} />;
}
