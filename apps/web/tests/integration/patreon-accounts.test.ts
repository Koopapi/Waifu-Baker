// Spec 001: membresía, concesiones, reembolsos, bienvenida, edad y ciclo de vida de la cuenta.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { albums, auditLog, packOpenings, packs, patreonLinks, sets, tierRules, userCards, users } from "@/db/schema";
import type { MemberState } from "@/domain/patreon/membership";
import { signPatreonBody } from "@/domain/patreon/webhook-signature";
import { handlePatreonWebhook } from "@/server/services/webhooks";
import { clearFakeMembers, FakePatreonClient, setFakeMember } from "@/server/adapters/fake-patreon";
import { accountSummary, deactivateAccount, declareAdult, prepareLogin, purgeExpiredAccounts } from "@/server/services/account";
import { activateAlbum } from "@/server/services/album";
import { archiveSet } from "@/server/services/collections";
import { applyMembership, reconcileAll, refreshIfStale, syncMemberById, syncOnLogin } from "@/server/services/membership";
import { openPack } from "@/server/services/packs";
import { upsertUserFromLogin } from "@/server/services/users";
import { getWelcomeSet, grantWelcomePack, setWelcomeSet } from "@/server/services/welcome";
import { inRollback } from "./db";
import { createPublishedSet, makeAdmin } from "./factories";

type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

const member = (patreonUserId: string, over: Partial<MemberState> = {}): MemberState => ({
  memberId: `mem-${patreonUserId}`,
  patreonUserId,
  patronStatus: "active_patron",
  lastChargeDate: new Date("2026-10-01T10:00:00Z"),
  lastChargeStatus: "Paid",
  nextChargeDate: new Date("2026-11-01T10:00:00Z"),
  entitledTierIds: ["t-sfw"],
  ...over,
});

async function world(tx: Tx) {
  const admin = await makeAdmin(tx);
  const sfw = await createPublishedSet(tx, admin.id, { code: "PAT1", rarities: ["common", "rare"], slots: [{ common: 100 }, { rare: 100 }] });
  const adult = await createPublishedSet(tx, admin.id, { code: "PAT1A", rarities: ["common"], slots: [{ common: 100 }], isAdult: true });
  await tx.insert(tierRules).values([
    { patreonTierId: "t-sfw", name: "SFW", setId: sfw.set.id, packsPerMonth: 3 },
    { patreonTierId: "t-adult", name: "18+", setId: sfw.set.id, packsPerMonth: 3 },
    { patreonTierId: "t-adult", name: "18+", setId: adult.set.id, packsPerMonth: 3 },
  ]);
  const fan = await upsertUserFromLogin(tx, { patreonUserId: "p-fan", displayName: "Fan", role: "user" });
  return { admin, sfw, adult, fan };
}

const sealed = (tx: Tx, userId: string, setId?: string) =>
  tx
    .select()
    .from(packs)
    .where(and(eq(packs.userId, userId), eq(packs.status, "sealed"), ...(setId ? [eq(packs.setId, setId)] : [])));

describe("spec 001 — vínculo y concesiones", () => {
  it("test_s001_rf2_al_entrar_se_guarda_solo_el_estado_de_membresia_sin_email", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      clearFakeMembers();
      setFakeMember(member("p-fan"));
      const r = await syncOnLogin(tx, new FakePatreonClient([]), { userId: fan.id, patreonUserId: "p-fan" });
      expect(r.ok).toBe(true);
      const [link] = await tx.select().from(patreonLinks).where(eq(patreonLinks.userId, fan.id));
      expect(link).toMatchObject({ memberId: "mem-p-fan", patronStatus: "active_patron", lastChargeStatus: "Paid", entitledTierIds: ["t-sfw"] });
      const [u] = await tx.select().from(users).where(eq(users.id, fan.id));
      expect(Object.keys(u)).not.toContain("email");
    });
  });

  it("test_s001_rf4_si_patreon_falla_se_entra_igual", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      const broken = { membershipOnLogin: async () => { throw new Error("caído"); } } as unknown as FakePatreonClient;
      expect((await syncOnLogin(tx, broken, { userId: fan.id, patreonUserId: "p-fan" })).ok).toBe(false);
    });
  });

  it("test_s001_rf3_con_sesion_se_relee_si_tiene_mas_de_15_minutos", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      clearFakeMembers();
      setFakeMember(member("p-fan", { patronStatus: "former_patron" }));
      await applyMembership(tx, fan.id, member("p-fan"));
      const client = new FakePatreonClient([]);
      expect(await refreshIfStale(tx, client, fan.id, new Date(Date.now() + 5 * 60_000))).toBe(false);
      expect(await refreshIfStale(tx, client, fan.id, new Date(Date.now() + 16 * 60_000))).toBe(true);
      const [link] = await tx.select().from(patreonLinks).where(eq(patreonLinks.userId, fan.id));
      expect(link.patronStatus).toBe("former_patron");
    });
  });

  it("test_s001_rf9_un_cobro_pagado_concede_los_sobres_una_sola_vez", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      expect(await applyMembership(tx, fan.id, member("p-fan"))).toEqual({ granted: 3, voided: 0 });
      expect(await applyMembership(tx, fan.id, member("p-fan"))).toEqual({ granted: 0, voided: 0 });
      expect(await sealed(tx, fan.id, sfw.set.id)).toHaveLength(3);
      // El ciclo siguiente concede otros 3.
      await applyMembership(tx, fan.id, member("p-fan", { lastChargeDate: new Date("2026-11-01T10:00:00Z"), nextChargeDate: new Date("2026-12-01T10:00:00Z") }));
      expect(await sealed(tx, fan.id, sfw.set.id)).toHaveLength(6);
    });
  });

  it("test_s001_rf10_subir_de_tier_concede_la_diferencia_al_momento", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw, adult } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan"));
      const r = await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-adult"], lastChargeDate: new Date("2026-10-15T10:00:00Z") }));
      // 18+ da 3 de PAT1 (ya los tenía) y 3 de PAT1A (nuevos).
      expect(r.granted).toBe(3);
      expect(await sealed(tx, fan.id, sfw.set.id)).toHaveLength(3);
      expect(await sealed(tx, fan.id, adult.set.id)).toHaveLength(3);
    });
  });

  it("test_s001_rf11_bajar_y_volver_a_subir_en_el_mismo_ciclo_no_da_sobres_extra", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-adult"] }));
      await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-sfw"] }));
      const r = await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-adult"] }));
      expect(r.granted).toBe(0);
      expect(await sealed(tx, fan.id)).toHaveLength(6);
    });
  });

  it("test_s001_rf12_al_vincular_tarde_solo_cuenta_el_ultimo_cobro", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      // Patron desde hace meses: Patreon solo informa del último cobro, y solo ese concede.
      await applyMembership(tx, fan.id, member("p-fan", { lastChargeDate: new Date("2027-02-01T10:00:00Z"), nextChargeDate: new Date("2027-03-01T10:00:00Z") }));
      expect(await sealed(tx, fan.id)).toHaveLength(3);
    });
  });

  it("test_s001_rf13_cancelar_conserva_los_sellados_y_no_concede_mas", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan"));
      const r = await applyMembership(tx, fan.id, member("p-fan", { patronStatus: "former_patron", entitledTierIds: [], nextChargeDate: new Date("2026-12-01T10:00:00Z") }));
      expect(r.granted).toBe(0);
      expect(await sealed(tx, fan.id)).toHaveLength(3);
    });
  });

  it("test_s001_rf14_un_reembolso_anula_solo_los_sellados_de_ese_cobro", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan"));
      const [first] = await sealed(tx, fan.id, sfw.set.id);
      await openPack(tx, { userId: fan.id, packId: first.id });
      const r = await applyMembership(tx, fan.id, member("p-fan", { lastChargeStatus: "Refunded" }));
      expect(r).toEqual({ granted: 0, voided: 2 });
      expect(await sealed(tx, fan.id)).toHaveLength(0);
      const opened = await tx.select().from(packs).where(and(eq(packs.userId, fan.id), eq(packs.status, "opened")));
      expect(opened).toHaveLength(1);
      expect((await tx.select().from(userCards).where(eq(userCards.userId, fan.id))).length).toBeGreaterThan(0);
      const log = await tx.select().from(auditLog).where(and(eq(auditLog.action, "packs_voided"), eq(auditLog.entityId, fan.id)));
      expect(log).toHaveLength(1);
    });
  });

  it("test_s001_rf15_un_aviso_aplica_el_estado_actual_aunque_llegue_repetido", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      clearFakeMembers();
      const memberId = setFakeMember(member("p-fan"));
      const client = new FakePatreonClient([]);
      await syncMemberById(tx, client, memberId);
      await syncMemberById(tx, client, memberId);
      expect(await sealed(tx, fan.id)).toHaveLength(3);
      // Un miembro que nunca entró no rompe nada.
      setFakeMember(member("p-nadie"));
      expect((await syncMemberById(tx, client, "mem-p-nadie")).known).toBe(false);
    });
  });

  it("test_s001_rf17_la_revision_periodica_recorre_a_todos_los_miembros", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      const other = await upsertUserFromLogin(tx, { patreonUserId: "p-otro", displayName: "Otro", role: "user" });
      clearFakeMembers();
      setFakeMember(member("p-fan"));
      setFakeMember(member("p-otro", { entitledTierIds: ["t-adult"] }));
      setFakeMember(member("p-sin-cuenta"));
      const r = await reconcileAll(tx, new FakePatreonClient([]));
      expect(r).toMatchObject({ members: 3, linked: 2, granted: 9 });
      expect(await sealed(tx, fan.id)).toHaveLength(3);
      expect(await sealed(tx, other.id)).toHaveLength(6);
    });
  });
});

describe("spec 001 — bienvenida", () => {
  it("test_s001_rf5_solo_una_coleccion_sfw_publicada_puede_ser_de_bienvenida", async () => {
    await inRollback(async (tx) => {
      const { admin, sfw, adult } = await world(tx);
      await expect(setWelcomeSet(tx, admin.id, adult.set.id)).rejects.toMatchObject({ code: "welcome_not_allowed" });
      await setWelcomeSet(tx, admin.id, sfw.set.id);
      const other = await createPublishedSet(tx, admin.id, { code: "PAT2", rarities: ["common"], slots: [{ common: 100 }] });
      await setWelcomeSet(tx, admin.id, other.set.id);
      expect((await getWelcomeSet(tx))?.id).toBe(other.set.id);
      expect(await tx.select().from(sets).where(eq(sets.isWelcome, true))).toHaveLength(1);
      // Archivarla la quita.
      const [cur] = await tx.select().from(sets).where(eq(sets.id, other.set.id));
      await archiveSet(tx, admin.id, other.set.id, cur.version);
      expect(await getWelcomeSet(tx)).toBeNull();
    });
  });

  it("test_s001_rf6_al_entrar_por_primera_vez_recibe_un_sobre_aunque_no_sea_patron", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw } = await world(tx);
      await setWelcomeSet(tx, admin.id, sfw.set.id);
      expect(await grantWelcomePack(tx, fan)).toBe(true);
      const [p] = await sealed(tx, fan.id, sfw.set.id);
      expect(p.source).toBe("promo");
    });
  });

  it("test_s001_rf7_sin_coleccion_de_bienvenida_llega_cuando_la_haya", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw } = await world(tx);
      expect(await grantWelcomePack(tx, fan)).toBe(false);
      await setWelcomeSet(tx, admin.id, sfw.set.id);
      expect(await grantWelcomePack(tx, fan)).toBe(true);
      expect(await grantWelcomePack(tx, fan)).toBe(false);
    });
  });

  it("test_s001_rf8_un_solo_sobre_de_bienvenida_por_cuenta_de_patreon_incluso_tras_borrarla", async () => {
    await inRollback(async (tx) => {
      const { admin, fan, sfw } = await world(tx);
      await setWelcomeSet(tx, admin.id, sfw.set.id);
      await grantWelcomePack(tx, fan);
      await deactivateAccount(tx, fan.id);
      await purgeExpiredAccounts(tx, new Date(Date.now() + 31 * 86_400_000));
      expect(await prepareLogin(tx, "p-fan")).toBe("new");
      const again = await upsertUserFromLogin(tx, { patreonUserId: "p-fan", displayName: "Fan", role: "user" });
      expect(again.id).not.toBe(fan.id);
      expect(await grantWelcomePack(tx, again)).toBe(false);
    });
  });
});

describe("spec 001 — edad y cuenta", () => {
  it("test_s001_rf18_declarar_la_edad_exige_un_tier_adulto_activo", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan"));
      await expect(declareAdult(tx, fan.id)).rejects.toMatchObject({ code: "adult_tier_required" });
      await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-adult"] }));
      const u = await declareAdult(tx, fan.id);
      expect(u.isAdultDeclared && u.adultVerifiedAt).toBeTruthy();
    });
  });

  it("test_s001_rf19_sin_verificacion_no_se_abre_contenido_18", async () => {
    await inRollback(async (tx) => {
      const { fan, adult } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-adult"] }));
      const [p] = await sealed(tx, fan.id, adult.set.id);
      await expect(openPack(tx, { userId: fan.id, packId: p.id })).rejects.toMatchObject({ code: "age_not_verified" });
      expect((await accountSummary(tx, fan.id))?.adult).toEqual({ declared: false, verified: false, hasAdultTier: true });
    });
  });

  it("test_s001_rf20_la_verificacion_se_mantiene_al_cancelar", async () => {
    await inRollback(async (tx) => {
      const { fan, adult } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-adult"] }));
      await declareAdult(tx, fan.id);
      await applyMembership(tx, fan.id, member("p-fan", { patronStatus: "former_patron", entitledTierIds: [] }));
      const [p] = await sealed(tx, fan.id, adult.set.id);
      const r = await openPack(tx, { userId: fan.id, packId: p.id });
      expect(r.cards).toHaveLength(1);
      expect((await accountSummary(tx, fan.id))?.adult.verified).toBe(true);
    });
  });

  it("test_s001_rf21_mi_cuenta_muestra_tier_estado_sobres_al_mes_y_ultimo_cobro", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan", { entitledTierIds: ["t-adult"] }));
      const s = await accountSummary(tx, fan.id);
      expect(s).toMatchObject({ tiers: [{ id: "t-adult", name: "18+" }], patronStatus: "active_patron", packsPerMonth: 6, lastChargeStatus: "Paid" });
      expect(s?.lastChargeDate?.toISOString()).toBe("2026-10-01T10:00:00.000Z");
    });
  });

  it("test_s001_rf22_desactivar_oculta_el_album_publico", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await activateAlbum(tx, fan.id, "Fan");
      await deactivateAccount(tx, fan.id);
      const [u] = await tx.select().from(users).where(eq(users.id, fan.id));
      expect(u.deletedAt).not.toBeNull();
      const [a] = await tx.select().from(albums).where(eq(albums.userId, fan.id));
      expect(a.isPublic).toBe(false);
    });
  });

  it("test_s001_rf23_volver_antes_de_30_dias_recupera_todo", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan"));
      await deactivateAccount(tx, fan.id);
      expect(await prepareLogin(tx, "p-fan", new Date(Date.now() + 10 * 86_400_000))).toBe("reactivated");
      const again = await upsertUserFromLogin(tx, { patreonUserId: "p-fan", displayName: "Fan", role: "user" });
      expect(again.id).toBe(fan.id);
      expect(again.deletedAt).toBeNull();
      expect(await sealed(tx, fan.id)).toHaveLength(3);
    });
  });

  it("test_s001_rf24_a_los_30_dias_se_borra_y_las_aperturas_quedan_anonimas", async () => {
    await inRollback(async (tx) => {
      const { fan, sfw } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan"));
      const [p] = await sealed(tx, fan.id, sfw.set.id);
      await openPack(tx, { userId: fan.id, packId: p.id });
      await activateAlbum(tx, fan.id, "Fan");
      await deactivateAccount(tx, fan.id);
      expect(await purgeExpiredAccounts(tx, new Date(Date.now() + 29 * 86_400_000))).toBe(0);
      expect(await purgeExpiredAccounts(tx, new Date(Date.now() + 31 * 86_400_000))).toBe(1);
      const [u] = await tx.select().from(users).where(eq(users.id, fan.id));
      expect(u).toMatchObject({ displayName: "", patreonUserId: null, avatarUrl: null });
      expect(u.purgedAt).not.toBeNull();
      expect(await tx.select().from(userCards).where(eq(userCards.userId, fan.id))).toHaveLength(0);
      expect(await tx.select().from(albums).where(eq(albums.userId, fan.id))).toHaveLength(0);
      expect(await sealed(tx, fan.id)).toHaveLength(0);
      expect(await tx.select().from(packOpenings).where(eq(packOpenings.userId, fan.id))).toHaveLength(1);
    });
  });

  it("test_s001_rf25_tras_el_borrado_definitivo_vuelve_con_una_cuenta_vacia", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      await applyMembership(tx, fan.id, member("p-fan"));
      await deactivateAccount(tx, fan.id);
      // Vuelve cuando ya venció pero la tarea diaria aún no pasó: se borra en ese momento.
      expect(await prepareLogin(tx, "p-fan", new Date(Date.now() + 31 * 86_400_000))).toBe("purged");
      const fresh = await upsertUserFromLogin(tx, { patreonUserId: "p-fan", displayName: "Fan", role: "user" });
      expect(fresh.id).not.toBe(fan.id);
      expect(await sealed(tx, fresh.id)).toHaveLength(0);
    });
  });
});

describe("spec 001 — avisos de Patreon", () => {
  it("test_s001_rf16_un_aviso_sin_firma_valida_no_cambia_nada", async () => {
    await inRollback(async (tx) => {
      const { fan } = await world(tx);
      clearFakeMembers();
      const memberId = setFakeMember(member("p-fan"));
      const rawBody = JSON.stringify({ data: { id: memberId, type: "member" } });
      const client = new FakePatreonClient([]);
      const bad = await handlePatreonWebhook(tx, client, { rawBody, signature: "0".repeat(32), eventType: "members:update", secret: "s3cr3t" });
      expect(bad).toBe("invalid_signature");
      expect(await sealed(tx, fan.id)).toHaveLength(0);
      const ok = await handlePatreonWebhook(tx, client, { rawBody, signature: signPatreonBody(rawBody, "s3cr3t"), eventType: "members:update", secret: "s3cr3t" });
      expect(ok).toBe("applied");
      expect(await sealed(tx, fan.id)).toHaveLength(3);
      const again = await handlePatreonWebhook(tx, client, { rawBody, signature: signPatreonBody(rawBody, "s3cr3t"), eventType: "members:update", secret: "s3cr3t" });
      expect(again).toBe("duplicate");
      expect(await sealed(tx, fan.id)).toHaveLength(3);
    });
  });
});
