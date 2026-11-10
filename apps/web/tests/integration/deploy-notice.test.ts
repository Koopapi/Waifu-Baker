import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appSettings } from "@/db/schema";
import type { Commit } from "@/domain/ops/deploy-notice";
import { notifyDeploy } from "@/server/services/deploy-notice";
import type { TelegramClient } from "@/server/ports/telegram";
import { inRollback, testDb } from "./db";

function fakeTelegram(fail = false) {
  const sent: string[] = [];
  const tg: TelegramClient = {
    botUsername: "bot",
    teamChatId: "-100",
    sendMessage: async (_chat, text) => {
      if (fail) throw new Error("Telegram caído");
      sent.push(text);
    },
    getUpdates: async () => [],
  };
  return { tg, sent };
}
const commits: Commit[] = [{ sha: "v2", parents: ["v1", "b"], message: "Merge pull request #45 from Koopapi/spec/032\n\nSpec 032: eliminar una colección" }];
const compare = async () => commits;
const site = "https://pruebas.waifubaker.com";

describe("spec 035 — aviso de despliegue", () => {
  it("test_s035_rf1_rf8_avisa_una_sola_vez_por_version_aunque_se_reinicie", async () => {
    await inRollback(async (tx) => {
      const { tg, sent } = fakeTelegram();
      expect(await notifyDeploy({ db: tx, telegram: tg, compare, commit: "v1", siteUrl: site })).toBe("sent");
      expect(sent[0]).toContain("Primer aviso de este entorno.");
      expect(await notifyDeploy({ db: tx, telegram: tg, compare, commit: "v1", siteUrl: site })).toBe("same_version");
      expect(await notifyDeploy({ db: tx, telegram: tg, compare, commit: "v2", siteUrl: site })).toBe("sent");
      expect(sent).toHaveLength(2);
      expect(sent[1]).toContain("• Spec 032: eliminar una colección (#45)");
      const [row] = await tx.select().from(appSettings).where(eq(appSettings.key, "deploy_notice"));
      expect(row.value).toMatchObject({ commit: "v2" });
    });
  });

  it("test_s035_rf2_produccion_tambien_avisa_y_dice_que_es_produccion", async () => {
    await inRollback(async (tx) => {
      const { tg, sent } = fakeTelegram();
      expect(await notifyDeploy({ db: tx, telegram: tg, compare, commit: "p1", siteUrl: "https://waifubaker.com" })).toBe("sent");
      expect(sent[0].split("\n")[0]).toMatch(/^✅ Producción actualizada · /);
      expect(sent[0].trim().split("\n").at(-1)).toBe("waifubaker.com");
    });
  });

  it("test_s035_rf6_sin_cambios_no_avisa", async () => {
    await inRollback(async (tx) => {
      const { tg, sent } = fakeTelegram();
      await notifyDeploy({ db: tx, telegram: tg, compare, commit: "v1", siteUrl: site });
      expect(await notifyDeploy({ db: tx, telegram: tg, compare: async () => [], commit: "v3", siteUrl: site })).toBe("no_changes");
      expect(sent).toHaveLength(1);
    });
  });

  it("test_s035_rf10_si_telegram_falla_no_rompe_y_no_vuelve_a_avisar", async () => {
    await inRollback(async (tx) => {
      const { tg } = fakeTelegram(true);
      expect(await notifyDeploy({ db: tx, telegram: tg, compare, commit: "v1", siteUrl: site })).toBe("send_failed");
      expect(await notifyDeploy({ db: tx, telegram: null, compare, commit: "v2", siteUrl: site })).toBe("not_configured");
      expect(await notifyDeploy({ db: tx, telegram: fakeTelegram().tg, compare, commit: undefined, siteUrl: site })).toBe("not_configured");
    });
  });

  it("test_s035_rf11_si_github_falla_avisa_sin_la_lista", async () => {
    await inRollback(async (tx) => {
      const { tg, sent } = fakeTelegram();
      await notifyDeploy({ db: tx, telegram: tg, compare, commit: "v1", siteUrl: site });
      const broken = async () => {
        throw new Error("GitHub 503");
      };
      expect(await notifyDeploy({ db: tx, telegram: tg, compare: broken, commit: "v2", siteUrl: site })).toBe("sent");
      expect(sent[1]).toContain("No se pudo leer la lista de cambios.");
    });
  });

  // Dos conexiones de verdad (como dos arranques a la vez): el bloqueo de la fila deja avisar a una sola.
  it("test_s035_rf8_dos_arranques_a_la_vez_dan_un_solo_aviso", async () => {
    const a = testDb();
    const b = testDb();
    try {
      await a.db.insert(appSettings).values({ key: "deploy_notice", value: { commit: "v1", at: "2026-11-09T00:00:00Z" } }).onConflictDoUpdate({ target: appSettings.key, set: { value: { commit: "v1", at: "2026-11-09T00:00:00Z" } } });
      const { tg, sent } = fakeTelegram();
      const r = await Promise.all([notifyDeploy({ db: a.db, telegram: tg, compare, commit: "v2", siteUrl: site }), notifyDeploy({ db: b.db, telegram: tg, compare, commit: "v2", siteUrl: site })]);
      expect(r.sort()).toEqual(["same_version", "sent"]);
      expect(sent).toHaveLength(1);
    } finally {
      await a.db.delete(appSettings).where(eq(appSettings.key, "deploy_notice"));
      await Promise.all([a.sql.end(), b.sql.end()]);
    }
  });
});
