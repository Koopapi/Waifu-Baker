import { describe, expect, it } from "vitest";
import { MODERATION_REASONS, REVIEW_COOLDOWN_DAYS, canRequestReview, isAlbumVisible, validateModerationNote } from "./moderation";

const NOW = new Date("2026-10-16T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("moderación de álbumes", () => {
  it("test_s012_rf4_motivos_de_la_lista_y_nota_de_hasta_300_caracteres", () => {
    expect(MODERATION_REASONS).toEqual(["offensive_alias", "impersonation", "spam", "other"]);
    expect(validateModerationNote("")).toEqual({ ok: true, value: null });
    expect(validateModerationNote("  Insulto en el alias  ")).toEqual({ ok: true, value: "Insulto en el alias" });
    expect(validateModerationNote("x".repeat(301)).ok).toBe(false);
  });

  it("test_s012_rf5_solo_se_ve_si_es_publico_y_no_esta_oculto", () => {
    expect(isAlbumVisible({ isPublic: true, moderation: "none" })).toBe(true);
    expect(isAlbumVisible({ isPublic: false, moderation: "none" })).toBe(false);
    for (const m of ["hidden", "review_requested", "review_rejected"] as const) expect(isAlbumVisible({ isPublic: true, moderation: m })).toBe(false);
  });

  it("test_s012_rf8_para_pedir_revision_hace_falta_un_alias_distinto", () => {
    const album = { moderation: "hidden" as const, alias: "Malo", reviewRequestedAt: null };
    expect(canRequestReview(album, "  malo ", NOW)).toEqual({ ok: false, code: "same_alias" });
    expect(canRequestReview(album, "Bueno", NOW)).toEqual({ ok: true });
  });

  it("test_s012_rf9_con_una_revision_pendiente_no_se_puede_pedir_otra", () => {
    expect(canRequestReview({ moderation: "review_requested", alias: "A", reviewRequestedAt: days(1) }, "B", NOW)).toEqual({ ok: false, code: "review_pending" });
  });

  it("test_s012_rf10_una_peticion_cada_7_dias_como_maximo", () => {
    expect(REVIEW_COOLDOWN_DAYS).toBe(7);
    const rejected = (n: number) => ({ moderation: "review_rejected" as const, alias: "A", reviewRequestedAt: days(n) });
    expect(canRequestReview(rejected(3), "B", NOW)).toEqual({ ok: false, code: "review_too_soon", until: new Date(days(3).getTime() + 7 * 86_400_000) });
    expect(canRequestReview(rejected(7), "B", NOW)).toEqual({ ok: true });
  });

  it("test_s012_rf8_un_album_no_oculto_no_pide_revision", () => {
    expect(canRequestReview({ moderation: "none", alias: "A", reviewRequestedAt: null }, "B", NOW)).toEqual({ ok: false, code: "not_hidden" });
  });
});
