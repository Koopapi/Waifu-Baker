import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { getSet } from "@/server/services/collections";
import { SimulateStage } from "@/features/admin/sets/SimulateStage";

export const metadata = { title: "Simular sobre · Panel" };

/** RF-23: apertura completa con las cartas y probabilidades reales de la colección. */
export default async function SimulatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const set = await getSet(db, id);
  if (!set) notFound();
  return <SimulateStage setId={set.id} label={`SIMULACIÓN · ${set.code}`} />;
}
