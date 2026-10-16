// Spec 012: moderación de álbumes públicos.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { albums, auditLog } from "@/db/schema";
import { activateAlbum, deactivateAlbum, publicAlbum } from "@/server/services/album";
import { dailyMetrics } from "@/server/services/metrics";
import { albumHistory, approveReview, hideAlbum, listAlbumsForAdmin, rejectReview, requestReview } from "@/server/services/moderation";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";

const NOW = new Date("2026-10-16T12:00:00Z");
const later = (d: number) => new Date(NOW.getTime() + d * 86_400_000);
type Tx = Parameters<Parameters<typeof inRollback>[0]>[0];

async function fanWithAlbum(tx: Tx, name: string, alias = `Alias ${name}`) {
  const fan = await upsertUserFromLogin(tx, { patreonUserId: `dev:${name}`, displayName: name, role: "user" });
  const album = await activateAlbum(tx, fan.id, alias, NOW);
  return { fan, album };
}

describe("ocultar", () => {
  it("test_s012_rf4_oculta_con_motivo_y_nota_y_lo_deja_en_el_historial", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan } = await fanWithAlbum(tx, "mod-a", "Insulto");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "offensive_alias", note: "Insulto en el alias", now: NOW });
      const [a] = await tx.select().from(albums).where(eq(albums.userId, fan.id));
      expect(a).toMatchObject({ moderation: "hidden", hiddenReason: "offensive_alias", hiddenNote: "Insulto en el alias", hiddenBy: admin.id });
      const log = await tx.select().from(auditLog).where(and(eq(auditLog.action, "album.hide"), eq(auditLog.entityId, fan.id)));
      expect(log).toHaveLength(1);
    });
  });

  it("test_s012_rf4_rechaza_motivos_desconocidos_y_notas_largas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan } = await fanWithAlbum(tx, "mod-b");
      await expect(hideAlbum(tx, admin.id, { userId: fan.id, reason: "boring" as never, now: NOW })).rejects.toMatchObject({ code: "invalid_moderation_reason" });
      await expect(hideAlbum(tx, admin.id, { userId: fan.id, reason: "spam", note: "x".repeat(301), now: NOW })).rejects.toMatchObject({ code: "note_too_long" });
    });
  });

  it("test_s012_rf5_un_album_oculto_no_se_ve_ni_cuenta_como_activo", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan, album } = await fanWithAlbum(tx, "mod-c");
      const before = (await dailyMetrics(tx, NOW, 7)).activeAlbums;
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "spam", now: NOW });
      expect(await publicAlbum(tx, album.slug)).toBeNull();
      expect((await dailyMetrics(tx, NOW, 7)).activeAlbums).toBe(before - 1);
    });
  });

  it("test_s012_rf6_ocultar_conserva_alias_enlace_y_destacadas", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan, album } = await fanWithAlbum(tx, "mod-d", "Mi alias");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "other", now: NOW });
      const [a] = await tx.select().from(albums).where(eq(albums.userId, fan.id));
      expect(a).toMatchObject({ slug: album.slug, alias: "Mi alias", isPublic: true, featuredCardIds: album.featuredCardIds });
    });
  });

  it("test_s012_rf14_desactivar_y_activar_un_album_oculto_lo_deja_oculto", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan } = await fanWithAlbum(tx, "mod-e");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "spam", now: NOW });
      await deactivateAlbum(tx, fan.id);
      await expect(activateAlbum(tx, fan.id, "Otro alias", NOW)).rejects.toMatchObject({ code: "album_hidden" });
      const [a] = await tx.select().from(albums).where(eq(albums.userId, fan.id));
      expect(a.moderation).toBe("hidden");
    });
  });
});

describe("revisión", () => {
  it("test_s012_rf9_pedir_revision_guarda_el_alias_propuesto_sin_publicarlo", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan, album } = await fanWithAlbum(tx, "mod-f", "Malo");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "offensive_alias", now: NOW });
      await expect(requestReview(tx, fan.id, "malo", NOW)).rejects.toMatchObject({ code: "same_alias" });
      await requestReview(tx, fan.id, "Bueno", NOW);
      const [a] = await tx.select().from(albums).where(eq(albums.userId, fan.id));
      expect(a).toMatchObject({ moderation: "review_requested", reviewAlias: "Bueno", alias: "Malo" });
      expect(await publicAlbum(tx, album.slug)).toBeNull();
      await expect(requestReview(tx, fan.id, "Otro", NOW)).rejects.toMatchObject({ code: "review_pending" });
    });
  });

  it("test_s012_rf11_aprobar_aplica_el_alias_y_vuelve_el_mismo_enlace", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan, album } = await fanWithAlbum(tx, "mod-g", "Malo");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "offensive_alias", now: NOW });
      await requestReview(tx, fan.id, "Bueno", NOW);
      await approveReview(tx, admin.id, { userId: fan.id, now: NOW });
      const pub = await publicAlbum(tx, album.slug);
      expect(pub?.alias).toBe("Bueno");
      const [a] = await tx.select().from(albums).where(eq(albums.userId, fan.id));
      expect(a).toMatchObject({ moderation: "none", slug: album.slug });
    });
  });

  it("test_s012_rf12_rechazar_mantiene_oculto_con_nota_y_rf10_espera_7_dias", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan, album } = await fanWithAlbum(tx, "mod-h", "Malo");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "impersonation", now: NOW });
      await requestReview(tx, fan.id, "Waifu Baker Oficial", NOW);
      await rejectReview(tx, admin.id, { userId: fan.id, note: "Sigue suplantando", now: NOW });
      const [a] = await tx.select().from(albums).where(eq(albums.userId, fan.id));
      expect(a).toMatchObject({ moderation: "review_rejected", reviewNote: "Sigue suplantando", alias: "Malo" });
      expect(await publicAlbum(tx, album.slug)).toBeNull();
      await expect(requestReview(tx, fan.id, "Otro", later(3))).rejects.toMatchObject({ code: "review_too_soon" });
      await requestReview(tx, fan.id, "Otro", later(7));
    });
  });

  it("test_s012_rf11_dos_administradores_a_la_vez_gana_el_primero", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const other = await makeAdmin(tx, "admin-2");
      const { fan } = await fanWithAlbum(tx, "mod-i", "Malo");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "spam", now: NOW });
      await requestReview(tx, fan.id, "Bueno", NOW);
      await approveReview(tx, admin.id, { userId: fan.id, now: NOW });
      await expect(rejectReview(tx, other.id, { userId: fan.id, now: NOW })).rejects.toMatchObject({ code: "review_already_decided" });
    });
  });
});

describe("panel", () => {
  it("test_s012_rf1_lista_publicos_y_ocultos_con_buscador_y_rf2_pendientes_primero", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await fanWithAlbum(tx, "mod-j", "Normal");
      const { fan: hidden } = await fanWithAlbum(tx, "mod-k", "Oculto");
      const { fan: pending } = await fanWithAlbum(tx, "mod-l", "Pendiente");
      const priv = await upsertUserFromLogin(tx, { patreonUserId: "dev:mod-m", displayName: "mod-m", role: "user" });
      await activateAlbum(tx, priv.id, "Privado", NOW);
      await deactivateAlbum(tx, priv.id);
      await hideAlbum(tx, admin.id, { userId: hidden.id, reason: "spam", now: NOW });
      await hideAlbum(tx, admin.id, { userId: pending.id, reason: "spam", now: NOW });
      await requestReview(tx, pending.id, "Pendiente bien", NOW);
      const all = await listAlbumsForAdmin(tx, {});
      const mine = all.filter((r) => r.owner.startsWith("mod-"));
      expect(mine[0]).toMatchObject({ owner: "mod-l", moderation: "review_requested", reviewAlias: "Pendiente bien" });
      expect(mine.map((r) => r.owner).sort()).toEqual(["mod-j", "mod-k", "mod-l"]);
      expect((await listAlbumsForAdmin(tx, { q: "oculto" })).map((r) => r.owner)).toEqual(["mod-k"]);
      expect((await listAlbumsForAdmin(tx, { q: "mod-j" })).map((r) => r.alias)).toEqual(["Normal"]);
    });
  });

  it("test_s012_rf3_rf13_historial_con_actor_motivo_nota_y_alias", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const { fan } = await fanWithAlbum(tx, "mod-n", "Malo");
      await hideAlbum(tx, admin.id, { userId: fan.id, reason: "offensive_alias", note: "N1", now: NOW });
      await requestReview(tx, fan.id, "Bueno", NOW);
      await rejectReview(tx, admin.id, { userId: fan.id, note: "N2", now: NOW });
      await requestReview(tx, fan.id, "Mejor", later(8));
      await approveReview(tx, admin.id, { userId: fan.id, now: later(8) });
      const h = await albumHistory(tx, fan.id);
      expect(h.map((e) => e.action)).toEqual(["album.review_approve", "album.review_request", "album.review_reject", "album.review_request", "album.hide"]);
      expect(h.at(-1)).toMatchObject({ actor: "Admin", reason: "offensive_alias", note: "N1", aliasBefore: "Malo" });
      expect(h[0]).toMatchObject({ aliasBefore: "Malo", aliasAfter: "Mejor" });
    });
  });
});
