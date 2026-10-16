import { eq } from "drizzle-orm";
import { appSettings } from "@/db/schema";
import { MIN_AGE, isMinAge, type MinAge } from "@/domain/legal/documents";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";
import { recordAudit } from "./audit";

const MIN_AGE_KEY = "min_age";

/** Spec 010, RF-17 a RF-19: la edad mínima vigente de la web (16 si nunca se cambió). */
export async function getMinAge(db: DbLike): Promise<MinAge> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, MIN_AGE_KEY));
  return isMinAge(row?.value) ? row.value : MIN_AGE;
}

/** RF-17: solo 16 o 18; el cambio queda en el historial con el valor anterior. */
export async function setMinAge(db: DbLike, actorUserId: string, age: number) {
  if (!isMinAge(age)) throw new AppError("invalid_min_age", "La edad mínima solo puede ser 16 o 18 años.");
  const before = await getMinAge(db);
  await db
    .insert(appSettings)
    .values({ key: MIN_AGE_KEY, value: age, updatedBy: actorUserId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: age, updatedBy: actorUserId, updatedAt: new Date() } });
  await recordAudit(db, { actorUserId, action: "settings.min_age", entityType: "settings", entityId: null, before: { minAge: before }, after: { minAge: age } });
  return age;
}
