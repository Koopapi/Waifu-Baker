import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { packs, patreonLinks, sets, tierRules, users } from "@/db/schema";
import { cycleKey, entitledPacks, grantKeys, isVoidableCharge, type MemberState, type RuleForGrant } from "@/domain/patreon/membership";
import type { DbLike } from "@/server/db-types";
import { AppError } from "@/server/errors";
import type { PatreonClient } from "@/server/ports/patreon";
import { recordAudit } from "./audit";

export const STALE_AFTER_MS = 15 * 60 * 1000;

/** Reglas de todos los tiers con lo necesario para decidir concesiones (RF-9). */
export async function loadGrantRules(db: DbLike): Promise<RuleForGrant[]> {
  const rows = await db
    .select({ rule: tierRules, isAdult: sets.isAdult, status: sets.status })
    .from(tierRules)
    .innerJoin(sets, eq(sets.id, tierRules.setId));
  return rows.map((r) => ({
    patreonTierId: r.rule.patreonTierId,
    setId: r.rule.setId,
    packsPerMonth: r.rule.packsPerMonth,
    active: r.rule.active,
    setIsAdult: r.isAdult,
    setGrantable: r.status === "published",
  }));
}

/** RF-1 y RF-2: guarda el último estado de la membresía (solo estado; nada de tokens ni email). */
async function saveLink(db: DbLike, userId: string, s: MemberState | null) {
  const values = {
    memberId: s?.memberId ?? null,
    patronStatus: s?.patronStatus ?? null,
    lastChargeDate: s?.lastChargeDate ?? null,
    lastChargeStatus: s?.lastChargeStatus ?? null,
    nextChargeDate: s?.nextChargeDate ?? null,
    entitledTierIds: s?.entitledTierIds ?? [],
    syncedAt: new Date(),
  };
  // Si otra fila tenía ese miembro (cuenta borrada), se suelta antes.
  if (values.memberId) await db.update(patreonLinks).set({ memberId: null }).where(and(eq(patreonLinks.memberId, values.memberId), sql`${patreonLinks.userId} <> ${userId}`));
  await db
    .insert(patreonLinks)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: patreonLinks.userId, set: { ...values, updatedAt: sql`now()` } });
}

/**
 * RF-9 a RF-14: aplica el estado actual de un miembro. Concede los sobres que falten del ciclo
 * (idempotente por clave) y, si el cobro se reembolsó o fue fraude, anula los sellados de ese ciclo.
 */
export async function applyMembership(db: DbLike, userId: string, state: MemberState | null) {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    if (!user || user.purgedAt || !user.patreonUserId) return { granted: 0, voided: 0 };
    await saveLink(tx, userId, state);
    if (!state) return { granted: 0, voided: 0 };
    const cycle = cycleKey(state);
    let voided = 0;
    if (cycle && isVoidableCharge(state.lastChargeStatus)) {
      const gone = await tx
        .update(packs)
        .set({ status: "void" })
        .where(and(eq(packs.userId, userId), eq(packs.cycleKey, cycle), eq(packs.status, "sealed"), eq(packs.source, "tier_grant")))
        .returning({ id: packs.id });
      voided = gone.length;
      if (voided) {
        await recordAudit(tx, {
          actorUserId: null,
          action: "packs_voided",
          entityType: "user",
          entityId: userId,
          meta: { cycle, chargeStatus: state.lastChargeStatus, count: voided },
        });
      }
    }
    let granted = 0;
    if (cycle && !user.deletedAt) {
      const perSet = entitledPacks(state, await loadGrantRules(tx));
      for (const [setId, total] of perSet) {
        const rows = grantKeys(user.patreonUserId, cycle, setId, total).map((grantKey) => ({
          userId,
          setId,
          source: "tier_grant" as const,
          grantKey,
          cycleKey: cycle,
          reason: "patreon",
        }));
        const added = await tx.insert(packs).values(rows).onConflictDoNothing({ target: packs.grantKey }).returning({ id: packs.id });
        if (added.length) {
          granted += added.length;
          await recordAudit(tx, {
            actorUserId: null,
            action: "packs_granted",
            entityType: "user",
            entityId: userId,
            meta: { cycle, setId, count: added.length, tiers: state.entitledTierIds },
          });
        }
      }
    }
    return { granted, voided };
  });
}

async function userByPatreonId(db: DbLike, patreonUserId: string) {
  const [u] = await db.select().from(users).where(eq(users.patreonUserId, patreonUserId));
  return u ?? null;
}

/**
 * RF-1 y RF-4: al entrar, se lee la membresía y se aplica. Si Patreon falla, se entra igual con lo
 * guardado y se reintenta en la siguiente lectura.
 */
export async function syncOnLogin(
  db: DbLike,
  client: PatreonClient | null,
  input: { userId: string; patreonUserId: string; userAccessToken?: string | null },
) {
  if (!client) return { ok: false as const };
  try {
    const state = await client.membershipOnLogin({ patreonUserId: input.patreonUserId, userAccessToken: input.userAccessToken });
    return { ok: true as const, ...(await applyMembership(db, input.userId, state)) };
  } catch (e) {
    console.warn("[patreon] no se pudo leer la membresía al entrar:", (e as Error).message);
    return { ok: false as const };
  }
}

/** RF-15: aplica el estado actual de un miembro concreto (tras un aviso). */
export async function syncMemberById(db: DbLike, client: PatreonClient, memberId: string) {
  const state = await client.getMember(memberId);
  if (state) {
    const user = await userByPatreonId(db, state.patreonUserId);
    // Quien nunca entró a la web recibirá los sobres de su ciclo al entrar (RF-12).
    if (!user) return { known: false as const };
    return { known: true as const, ...(await applyMembership(db, user.id, state)) };
  }
  // El miembro ya no existe en Patreon: deja de tener derecho a sobres, conserva lo que tiene.
  const [link] = await db.select().from(patreonLinks).where(eq(patreonLinks.memberId, memberId));
  if (!link) return { known: false as const };
  const [u] = await db.select().from(users).where(eq(users.id, link.userId));
  await applyMembership(db, link.userId, u?.patreonUserId ? { memberId, patreonUserId: u.patreonUserId, patronStatus: "former_patron", lastChargeDate: link.lastChargeDate, lastChargeStatus: link.lastChargeStatus, nextChargeDate: link.nextChargeDate, entitledTierIds: [] } : null);
  return { known: true as const, granted: 0, voided: 0 };
}

/** RF-3: con sesión, se vuelve a leer la membresía si la última lectura tiene más de 15 minutos. */
export async function refreshIfStale(db: DbLike, client: PatreonClient | null, userId: string, now = new Date()) {
  if (!client) return false;
  const [link] = await db.select().from(patreonLinks).where(eq(patreonLinks.userId, userId));
  if (!link?.memberId || now.getTime() - link.syncedAt.getTime() < STALE_AFTER_MS) return false;
  try {
    await syncMemberById(db, client, link.memberId);
    return true;
  } catch (e) {
    console.warn("[patreon] no se pudo refrescar la membresía:", (e as Error).message);
    return false;
  }
}

/** RF-17: revisa a todos los miembros de la campaña. */
export async function reconcileAll(db: DbLike, client: PatreonClient | null) {
  if (!client) throw new AppError("patreon_unavailable", "Patreon no está configurado.");
  let members: MemberState[];
  try {
    members = await client.listMembers();
  } catch (e) {
    throw new AppError("patreon_unavailable", `Patreon no respondió: ${(e as Error).message}`);
  }
  const ids = [...new Set(members.map((m) => m.patreonUserId))];
  const known = ids.length ? await db.select({ id: users.id, patreonUserId: users.patreonUserId }).from(users).where(inArray(users.patreonUserId, ids)) : [];
  const byPatreon = new Map(known.map((u) => [u.patreonUserId, u.id]));
  let granted = 0;
  let voided = 0;
  for (const m of members) {
    const userId = byPatreon.get(m.patreonUserId);
    if (!userId) continue;
    const r = await applyMembership(db, userId, m);
    granted += r.granted;
    voided += r.voided;
  }
  return { members: members.length, linked: byPatreon.size, granted, voided };
}

/** Miembros cuyo estado lleva tiempo sin leerse (para diagnósticos del panel). */
export async function staleLinks(db: DbLike, olderThan: Date) {
  return db.select().from(patreonLinks).where(lt(patreonLinks.syncedAt, olderThan));
}
