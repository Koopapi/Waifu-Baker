import { and, asc, eq, sql } from "drizzle-orm";
import { sets, tierRules } from "@/db/schema";
import { canGrantPacks } from "@/domain/catalog/collection-rules";
import type { PatreonClient } from "@/server/ports/patreon";
import type { DbLike } from "@/server/db-types";
import { AdminError } from "@/server/errors";
import { auditChange, recordAudit } from "./audit";

export interface TierRuleInput {
  patreonTierId: string;
  tierName: string;
  setId: string;
  packsPerMonth: number;
  active: boolean;
}

/** RF-24: crea o actualiza la regla tier → colección. Solo colecciones publicadas. */
export async function saveTierRule(db: DbLike, actorUserId: string, input: TierRuleInput) {
  if (!Number.isInteger(input.packsPerMonth) || input.packsPerMonth < 1 || input.packsPerMonth > 50) {
    throw new AdminError("invalid_packs", "Los sobres al mes deben ser un número entero entre 1 y 50.");
  }
  if (!input.patreonTierId.trim()) throw new AdminError("invalid_tier", "Falta el tier de Patreon.");
  return db.transaction(async (tx) => {
    const [set] = await tx.select().from(sets).where(eq(sets.id, input.setId));
    if (!set) throw new AdminError("not_found", "La colección no existe.");
    if (!canGrantPacks(set.status)) {
      throw new AdminError("not_grantable", `${set.code} no está publicada: solo las colecciones publicadas se pueden asignar a un tier.`);
    }
    const [prev] = await tx
      .select()
      .from(tierRules)
      .where(and(eq(tierRules.patreonTierId, input.patreonTierId), eq(tierRules.setId, input.setId)));
    const values = { name: input.tierName.trim(), packsPerMonth: input.packsPerMonth, active: input.active };
    const [row] = await tx
      .insert(tierRules)
      .values({ patreonTierId: input.patreonTierId, setId: input.setId, ...values })
      .onConflictDoUpdate({ target: [tierRules.patreonTierId, tierRules.setId], set: { ...values, updatedAt: sql`now()` } })
      .returning();
    await auditChange(tx, {
      actorUserId,
      action: "tier_rule_save",
      entityType: "tier_rule",
      entityId: row.id,
      before: prev ? { packsPerMonth: prev.packsPerMonth, active: prev.active } : { packsPerMonth: null, active: null },
      after: { packsPerMonth: row.packsPerMonth, active: row.active, tier: input.patreonTierId, set: set.code },
    });
    return row;
  });
}

export async function deleteTierRule(db: DbLike, actorUserId: string, ruleId: string) {
  const [gone] = await db.delete(tierRules).where(eq(tierRules.id, ruleId)).returning();
  if (!gone) throw new AdminError("not_found", "La regla no existe.");
  await recordAudit(db, { actorUserId, action: "tier_rule_delete", entityType: "tier_rule", entityId: ruleId, before: gone });
}

/** Tiers de la campaña con sus reglas, reglas de tiers que ya no existen y colecciones asignables. */
export async function tierOverview(db: DbLike, client: PatreonClient) {
  const [tiers, rules, grantable] = await Promise.all([
    client.listCampaignTiers(),
    db
      .select({ rule: tierRules, setCode: sets.code, setName: sets.name, setIsAdult: sets.isAdult, setStatus: sets.status })
      .from(tierRules)
      .innerJoin(sets, eq(sets.id, tierRules.setId))
      .orderBy(asc(sets.code)),
    db.select().from(sets).where(eq(sets.status, "published")).orderBy(asc(sets.code)),
  ]);
  const flat = rules.map((r) => ({ ...r.rule, setCode: r.setCode, setName: r.setName, setIsAdult: r.setIsAdult, setStatus: r.setStatus }));
  const known = new Set(tiers.map((t) => t.id));
  return {
    tiers: tiers.map((t) => ({ ...t, rules: flat.filter((r) => r.patreonTierId === t.id) })),
    orphanRules: flat.filter((r) => !known.has(r.patreonTierId)),
    grantableSets: grantable,
  };
}
