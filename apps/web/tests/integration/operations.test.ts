// Spec 007: aceptación de términos, actividad diaria y métricas.
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { userDays, users } from "@/db/schema";
import { TERMS_VERSION, needsAcceptance } from "@/domain/legal/documents";
import { acceptTerms, trackActivity } from "@/server/services/legal";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";

describe("spec 007 — aceptación y actividad", () => {
  it("test_s007_rf1_aceptar_guarda_la_edad_y_la_version_de_los_terminos", async () => {
    await inRollback(async (tx) => {
      const u = await upsertUserFromLogin(tx, { patreonUserId: "p-gate", displayName: "Gate", role: "user" });
      expect(needsAcceptance(u)).toBe(true);
      const accepted = await acceptTerms(tx, u.id, new Date("2026-10-15T12:00:00Z"));
      expect(accepted.termsVersion).toBe(TERMS_VERSION);
      expect(accepted.ageConfirmedAt?.toISOString()).toBe("2026-10-15T12:00:00.000Z");
      expect(needsAcceptance(accepted)).toBe(false);
      // Aceptar otra vez (términos nuevos) no cambia la fecha de la confirmación de edad.
      const again = await acceptTerms(tx, u.id, new Date("2027-01-01T12:00:00Z"));
      expect(again.ageConfirmedAt?.toISOString()).toBe("2026-10-15T12:00:00.000Z");
      expect(again.termsAcceptedAt?.toISOString()).toBe("2027-01-01T12:00:00.000Z");
    });
  });

  it("test_s007_rf2_quien_no_acepta_sigue_bloqueado", async () => {
    await inRollback(async (tx) => {
      const u = await upsertUserFromLogin(tx, { patreonUserId: "p-gate2", displayName: "Gate", role: "user" });
      const [row] = await tx.select().from(users).where(eq(users.id, u.id));
      expect(needsAcceptance(row)).toBe(true);
    });
  });

  it("test_s007_rf11_la_actividad_se_anota_una_vez_por_dia", async () => {
    await inRollback(async (tx) => {
      const u = await upsertUserFromLogin(tx, { patreonUserId: "p-act", displayName: "Act", role: "user" });
      await trackActivity(tx, u.id, new Date("2026-10-15T10:00:00Z"));
      await trackActivity(tx, u.id, new Date("2026-10-15T23:00:00Z"));
      await trackActivity(tx, u.id, new Date("2026-10-16T01:00:00Z"));
      const days = await tx.select().from(userDays).where(eq(userDays.userId, u.id));
      expect(days.map((d) => d.day).sort()).toEqual(["2026-10-15", "2026-10-16"]);
    });
  });
});

describe("spec 007 — copias de seguridad", () => {
  const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/waifu_baker_test";

  it("test_s007_rf15_una_copia_se_restaura_en_una_bd_aparte_y_coincide", async () => {
    const { mkdtemp, mkdir, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const { createBackup, restoreBackup } = await import("@/server/backup/core");
    const dir = await mkdtemp(path.join(tmpdir(), "wb-it-"));
    const cards = path.join(dir, "cards");
    await mkdir(path.join(cards, "set"), { recursive: true });
    await writeFile(path.join(cards, "set", "a.webp"), "a");
    await writeFile(path.join(cards, "set", "b.webp"), "b");
    const b = await createBackup({ databaseUrl: TEST_URL, cardsDir: cards, outDir: path.join(dir, "out"), passphrase: "clave-de-prueba-larga" });
    expect(b.manifest.images).toBe(2);
    expect(Object.keys(b.manifest.tables)).toContain("users");
    const r = await restoreBackup({
      file: b.file,
      passphrase: "clave-de-prueba-larga",
      targetDatabaseUrl: TEST_URL.replace(/\/[^/]+$/, "/waifu_baker_test_restore"),
      targetCardsDir: path.join(dir, "restored"),
      liveDatabaseUrl: TEST_URL,
    });
    expect(r).toMatchObject({ ok: true, images: 2, mismatches: [] });
    await expect(
      restoreBackup({ file: b.file, passphrase: "clave-de-prueba-larga", targetDatabaseUrl: TEST_URL, targetCardsDir: path.join(dir, "x"), liveDatabaseUrl: TEST_URL }),
    ).rejects.toThrow(/en uso/);
  }, 60_000);

  it("test_s007_rf16_una_copia_fallida_queda_registrada", async () => {
    const { runBackup, backupStatus } = await import("@/server/services/backups");
    await inRollback(async (tx) => {
      const r = await runBackup(tx, { databaseUrl: TEST_URL, cardsDir: "/no/existe", outDir: "/tmp/wb-it-out", passphrase: null });
      expect(r.ok).toBe(false);
      const s = await backupStatus(tx);
      expect(s.lastFailure?.error).toMatch(/BACKUP_PASSPHRASE/);
    });
  });

  it("test_s007_rf17_el_panel_conoce_la_ultima_copia_correcta", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const { runBackup, backupStatus } = await import("@/server/services/backups");
    const dir = await mkdtemp(path.join(tmpdir(), "wb-it-ok-"));
    await inRollback(async (tx) => {
      const r = await runBackup(tx, { databaseUrl: TEST_URL, cardsDir: path.join(dir, "cards"), outDir: path.join(dir, "out"), passphrase: "clave-de-prueba-larga" });
      expect(r.ok).toBe(true);
      const s = await backupStatus(tx);
      expect(s.lastOk?.file).toMatch(/^wb-backup-.*\.wbk$/);
      expect(s.lastOk?.bytes).toBeGreaterThan(0);
    });
  }, 60_000);
});

describe("spec 007 — métricas", () => {
  it("test_s007_rf11_metricas_diarias_de_30_dias", async () => {
    const { dailyMetrics } = await import("@/server/services/metrics");
    const { claimDaily, claimFreePack } = await import("@/server/services/rewards");
    const { createPublishedSet, makeAdmin } = await import("./factories");
    const { activateAlbum } = await import("@/server/services/album");
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const set = await createPublishedSet(tx, admin.id, { code: "MET1", isFree: true, rarities: ["common"], slots: [{ common: 100 }] });
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "p-met", displayName: "Met", role: "user" });
      const now = new Date();
      await trackActivity(tx, fan.id, now);
      await claimFreePack(tx, fan.id, { setId: set.set.id, now });
      await claimDaily(tx, fan.id, { now, timeZone: "UTC" });
      await activateAlbum(tx, fan.id, "Met");
      const m = await dailyMetrics(tx, now);
      expect(m.days).toHaveLength(30);
      expect(m.days[0]).toMatchObject({ day: now.toISOString().slice(0, 10) });
      expect(m.days[0].newUsers).toBeGreaterThanOrEqual(2);
      expect(m.days[0].activeUsers).toBeGreaterThanOrEqual(1);
      expect(m.days[0].freeClaims).toBeGreaterThanOrEqual(1);
      expect(m.days[0].dailyClaims).toBeGreaterThanOrEqual(1);
      expect(m.activeAlbums).toBeGreaterThanOrEqual(1);
    });
  });

  it("test_s007_rf12_las_metricas_salen_solo_de_datos_propios", async () => {
    const src = (await import("node:fs")).readFileSync(new URL("../../src/server/services/metrics.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/fetch\(|https?:\/\//);
  });
});
