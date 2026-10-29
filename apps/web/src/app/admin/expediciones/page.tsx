import { db } from "@/db/client";
import { ZonesAdmin } from "@/features/admin/expeditions/ZonesAdmin";
import { gamesDictionaries } from "@/i18n/games";
import { getLocale } from "@/i18n/server";
import { listZones } from "@/server/services/expedition-zones";

export async function generateMetadata() {
  return { title: gamesDictionaries[await getLocale()].admin.title };
}

/** Spec 020, RF-28 a RF-30: zonas del mapa, botín por duración y simulador. */
export default async function AdminExpeditionsPage() {
  const zones = await listZones(db);
  return (
    <ZonesAdmin
      zones={zones.map((z) => ({
        id: z.id,
        name: z.name,
        terrain: z.terrain,
        difficulty: z.difficulty,
        fragmentsRequired: z.fragmentsRequired,
        sortOrder: z.sortOrder,
        active: z.active,
        loot: z.loot,
        image: z.imageKey ? `/api/zones/${z.id}/img?v=${z.imageKey.slice(-16, -5)}` : null,
      }))}
    />
  );
}
