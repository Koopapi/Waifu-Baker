// Spec 020, RF-26 a RF-30: zonas de Expediciones en el panel (crear, editar, imagen, botín y simulador) y sus
// probabilidades públicas.
import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import sharp from "sharp";
import { expeditionZones } from "@/db/schema";
import { DURATIONS, TERRAINS, type DurationMin, type TeamMember, type Terrain, type ZoneLoot } from "@/domain/expeditions/rules";
import { simulate } from "@/domain/expeditions/simulate";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import type { CardStore } from "@/server/ports/card-store";
import { inspectUpload, type UploadFile } from "./cards";
import { auditChange, recordAudit } from "./audit";

export type Zone = typeof expeditionZones.$inferSelect;

export interface ZoneInput {
  id?: string;
  name: string;
  terrain: Terrain;
  difficulty: number;
  fragmentsRequired: number;
  sortOrder: number;
  active: boolean;
  loot: ZoneLoot;
}

const isInt = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;

/** Valida una zona; los errores llevan el campo para enseñarlo junto al formulario. */
export function cleanZone(input: ZoneInput): Omit<ZoneInput, "id"> {
  const name = input.name.trim();
  if (!name || name.length > 40) throw new AdminError("invalid_zone", "El nombre de la zona es obligatorio y admite hasta 40 caracteres.", { field: "name" });
  if (!TERRAINS.includes(input.terrain)) throw new AdminError("invalid_zone", "Ese terreno no existe.", { field: "terrain" });
  if (!isInt(input.difficulty, 1, 1000)) throw new AdminError("invalid_zone", "La dificultad va de 1 a 1000.", { field: "difficulty" });
  if (!isInt(input.fragmentsRequired, 0, 999)) throw new AdminError("invalid_zone", "Los fragmentos para abrirla van de 0 a 999.", { field: "fragments" });
  if (!isInt(input.sortOrder, 0, 99)) throw new AdminError("invalid_zone", "El orden va de 0 a 99.", { field: "order" });
  const loot = {} as ZoneLoot;
  for (const d of DURATIONS) {
    const l = input.loot?.[`${d}`];
    if (!l || !isInt(l.cookies, 0, 10_000) || !isInt(l.fragments, 0, 100) || !(l.packChance >= 0 && l.packChance <= 1)) {
      throw new AdminError("invalid_zone", "El botín de cada duración necesita galletas (0 a 10 000), fragmentos (0 a 100) y una probabilidad de sobre de 0 a 100 %.", { field: "loot" });
    }
    loot[`${d}`] = { cookies: l.cookies, fragments: l.fragments, packChance: Math.round(l.packChance * 10_000) / 10_000 };
  }
  return { name, terrain: input.terrain, difficulty: input.difficulty, fragmentsRequired: input.fragmentsRequired, sortOrder: input.sortOrder, active: input.active, loot };
}

/** RF-28 y RF-29: crea o edita una zona con su botín. Lo ya enviado mantiene lo congelado (RF-17). */
export async function saveZone(db: DbLike, actorUserId: string, input: ZoneInput): Promise<Zone> {
  const next = cleanZone(input);
  if (!input.id) {
    const [z] = await db.insert(expeditionZones).values(next).returning();
    await recordAudit(db, { actorUserId, action: "expedition_zone_create", entityType: "expedition_zone", entityId: z.id, after: next });
    return z;
  }
  const [cur] = await db.select().from(expeditionZones).where(eq(expeditionZones.id, input.id));
  if (!cur) throw new AdminError("not_found", "La zona no existe.", { entity: "zone" });
  const [z] = await db.update(expeditionZones).set({ ...next, updatedAt: new Date() }).where(eq(expeditionZones.id, input.id)).returning();
  await auditChange(db, { actorUserId, action: "expedition_zone_update", entityType: "expedition_zone", entityId: z.id, before: { ...cur, createdAt: undefined, updatedAt: undefined }, after: next });
  return z;
}

export async function listZones(db: DbLike): Promise<Zone[]> {
  return db.select().from(expeditionZones).orderBy(asc(expeditionZones.sortOrder), asc(expeditionZones.name));
}

export async function getZone(db: DbLike, id: string): Promise<Zone> {
  const [z] = await db.select().from(expeditionZones).where(eq(expeditionZones.id, id));
  if (!z) throw new AdminError("not_found", "La zona no existe.", { entity: "zone" });
  return z;
}

/** Imagen de una zona en el mapa (16:10, como la tarjeta de la zona). */
export const ZONE_IMAGE = { width: 960, height: 600 };

/** RF-28: sube la imagen de la zona; sustituye a la anterior. */
export async function uploadZoneImage(db: DbLike, store: CardStore, actorUserId: string, zoneId: string, file: UploadFile) {
  const zone = await getZone(db, zoneId);
  await inspectUpload(file);
  const body = await sharp(file.body).resize(ZONE_IMAGE.width, ZONE_IMAGE.height, { fit: "cover", position: "attention" }).webp({ quality: 84 }).toBuffer();
  const key = `zones/${zoneId}/${createHash("sha256").update(body).digest("hex").slice(0, 32)}.webp`;
  await store.put(key, body);
  await db.update(expeditionZones).set({ imageKey: key, updatedAt: new Date() }).where(eq(expeditionZones.id, zoneId));
  if (zone.imageKey && zone.imageKey !== key) await store.delete(zone.imageKey);
  await recordAudit(db, { actorUserId, action: "expedition_zone_image", entityType: "expedition_zone", entityId: zoneId, after: { filename: file.filename } });
  return key;
}

/** La imagen de una zona activa (el arte de las zonas es SFW: lo ve cualquiera con sesión). */
export async function zoneImageFile(db: DbLike, store: CardStore, zoneId: string, asAdmin = false) {
  const [z] = await db.select().from(expeditionZones).where(eq(expeditionZones.id, zoneId));
  if (!z?.imageKey || (!z.active && !asAdmin)) return null;
  return store.get(z.imageKey);
}

/** RF-30: simulador del panel con una zona guardada. */
export async function simulateZone(db: DbLike, zoneId: string, team: TeamMember[], duration: DurationMin, opts: { runs?: number; seed?: number } = {}) {
  if (team.length < 1 || team.length > 3) throw new AdminError("invalid_team", "El equipo lleva de 1 a 3 cartas.");
  if (!DURATIONS.includes(duration)) throw new AdminError("invalid_duration", "La duración debe ser 30 min, 2 h u 8 h.");
  const zone = await getZone(db, zoneId);
  return simulate({ terrain: zone.terrain, difficulty: zone.difficulty, loot: zone.loot }, team, duration, opts);
}

/** RF-26: probabilidad de sobre de cada zona activa y duración, para la página de Probabilidades. */
export async function publicZoneOdds(db: DbLike) {
  const zones = await db.select().from(expeditionZones).where(eq(expeditionZones.active, true)).orderBy(asc(expeditionZones.sortOrder), asc(expeditionZones.name));
  return zones.map((z) => ({ id: z.id, name: z.name, terrain: z.terrain, chances: DURATIONS.map((d) => ({ duration: d, packChance: z.loot[`${d}`].packChance })) }));
}
