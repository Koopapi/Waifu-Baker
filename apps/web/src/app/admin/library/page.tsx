import { db } from "@/db/client";
import { LibraryPage } from "@/features/admin/library/LibraryPage";
import { assetUrl } from "@/features/admin/cards/types";
import { listLibrary } from "@/server/services/library";

/** Spec 017 (ampliación), RF-6 y RF-9: biblioteca general de elementos. */
export default async function AdminLibraryPage() {
  const items = await listLibrary(db);
  return <LibraryPage items={items.map((i) => ({ id: i.id, kind: i.kind, name: i.name, url: assetUrl(i.key), particles: i.particles, uses: i.uses, sets: i.sets }))} />;
}
