// Spec 024, RF-14 a RF-21: acceso del equipo con contraseña y código de Telegram (bot falso).
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { adminAccounts, auditLog, users } from "@/db/schema";
import type { TelegramClient, TelegramUpdate } from "@/server/ports/telegram";
import {
  changeAdminPassword,
  checkTelegramLink,
  createAdminAccount,
  deleteAdminAccount,
  notifyAdmins,
  resendAdminCode,
  resetAdminPassword,
  startAdminLogin,
  verifyAdminCode,
} from "@/server/services/admin-accounts";
import { inRollback } from "./db";

class FakeBot implements TelegramClient {
  readonly botUsername = "waifubaker_admin_bot";
  teamChatId: string | null = null;
  sent: { chatId: string; text: string }[] = [];
  updates: TelegramUpdate[] = [];
  async sendMessage(chatId: string, text: string) {
    this.sent.push({ chatId, text });
  }
  async getUpdates() {
    return this.updates;
  }
  lastCode() {
    return this.sent.at(-1)?.text.match(/(\d{6})/)?.[1] ?? "";
  }
}

const T0 = new Date("2026-10-29T12:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

/** Cuenta lista: contraseña cambiada y Telegram vinculado; devuelve el paso en curso con un código enviado. */
async function ready(tx: Parameters<Parameters<typeof inRollback>[0]>[0], bot: FakeBot) {
  const { password } = await createAdminAccount(tx, "koopa");
  const s1 = await startAdminLogin(tx, bot, { username: "koopa", password, now: T0 });
  if (s1.status !== "ok") throw new Error(s1.status);
  const s2 = await changeAdminPassword(tx, bot, { pending: s1.pending, newPassword: "mi-contraseña-nueva-larga", now: T0 });
  if (s2.status !== "ok") throw new Error(s2.status);
  bot.updates = [{ updateId: 1, chatId: "555", text: `/start ${new URL(s2.linkUrl!).searchParams.get("start")}` }];
  const s3 = await checkTelegramLink(tx, bot, { pending: s1.pending, now: T0 });
  if (s3.status !== "ok") throw new Error(s3.status);
  return { pending: s1.pending };
}

describe("spec 024 — acceso del equipo", () => {
  it("test_s024_rf15_la_cuenta_se_crea_por_comando_con_su_usuario_administrador", async () => {
    await inRollback(async (tx) => {
      const { password } = await createAdminAccount(tx, "Bruno");
      expect(password).toHaveLength(20);
      const [acc] = await tx.select().from(adminAccounts).where(eq(adminAccounts.username, "bruno"));
      expect(acc.passwordHash).not.toContain(password);
      expect(acc.mustChangePassword).toBe(true);
      const [u] = await tx.select().from(users).where(eq(users.id, acc.userId));
      expect([u.role, u.patreonUserId]).toEqual(["admin", "admin:bruno"]);
      await expect(createAdminAccount(tx, "bruno")).rejects.toMatchObject({ code: "username_taken" });
    });
  });

  it("test_s024_rf14_rf16_rf17_contrasena_cambio_vinculacion_y_codigo_abren_la_sesion", async () => {
    await inRollback(async (tx) => {
      const bot = new FakeBot();
      const { password } = await createAdminAccount(tx, "koopa");
      const s1 = await startAdminLogin(tx, bot, { username: "koopa", password, now: T0 });
      expect(s1).toMatchObject({ status: "ok", next: "change" });
      const pending = (s1 as { pending: string }).pending;
      // RF-16: tras la contraseña nueva hay que vincular Telegram; hasta que el bot no reciba /start, espera.
      const s2 = await changeAdminPassword(tx, bot, { pending, newPassword: "mi-contraseña-nueva-larga", now: T0 });
      expect(s2).toMatchObject({ status: "ok", next: "link" });
      const linkUrl = (s2 as { linkUrl: string }).linkUrl;
      expect(linkUrl).toMatch(/^https:\/\/t\.me\/waifubaker_admin_bot\?start=[0-9a-f]{24}$/);
      expect(await checkTelegramLink(tx, bot, { pending, now: T0 })).toEqual({ status: "waiting" });
      // Si Telegram pierde el código del enlace (chat ya abierto), un «/start» suelto no vincula…
      bot.updates = [{ updateId: 6, chatId: "555", text: "/start" }];
      expect(await checkTelegramLink(tx, bot, { pending, now: T0 })).toEqual({ status: "waiting" });
      // …pero el código enviado a mano sí (el enlace con «/start <código>» lo cubre `ready`).
      bot.updates = [{ updateId: 7, chatId: "555", text: new URL(linkUrl).searchParams.get("start")! }];
      expect(await checkTelegramLink(tx, bot, { pending, now: at(1) })).toEqual({ status: "ok", next: "code" });
      // RF-17: el código llega a ese chat y abre la sesión una sola vez.
      expect(bot.sent.at(-1)!.chatId).toBe("555");
      const code = bot.lastCode();
      expect(await verifyAdminCode(tx, { pending, code, now: at(2) })).toMatchObject({ status: "ok", username: "koopa" });
      expect(await verifyAdminCode(tx, { pending, code, now: at(2) })).toEqual({ status: "expired" });
      // La próxima vez, directo al código.
      const again = await startAdminLogin(tx, bot, { username: "koopa", password: "mi-contraseña-nueva-larga", now: at(10) });
      expect(again).toMatchObject({ status: "ok", next: "code" });
    });
  });

  it("test_s024_rf17_el_codigo_caduca_a_los_5_minutos", async () => {
    await inRollback(async (tx) => {
      const bot = new FakeBot();
      const { pending } = await ready(tx, bot);
      expect(await verifyAdminCode(tx, { pending, code: bot.lastCode(), now: at(6) })).toEqual({ status: "expired" });
    });
  });

  it("test_s024_rf18_reenvios_limitados", async () => {
    await inRollback(async (tx) => {
      const bot = new FakeBot();
      const { pending } = await ready(tx, bot);
      for (let i = 0; i < 3; i++) expect(await resendAdminCode(tx, bot, { pending, now: at(1) })).toEqual({ status: "ok" });
      expect(await resendAdminCode(tx, bot, { pending, now: at(1) })).toEqual({ status: "limit" });
    });
  });

  it("test_s024_rf19_cinco_fallos_bloquean_15_minutos_y_queda_en_el_historial", async () => {
    await inRollback(async (tx) => {
      const bot = new FakeBot();
      await createAdminAccount(tx, "koopa");
      for (let i = 0; i < 4; i++) expect(await startAdminLogin(tx, bot, { username: "koopa", password: "mala", now: T0 })).toEqual({ status: "invalid" });
      expect(await startAdminLogin(tx, bot, { username: "koopa", password: "mala", now: T0 })).toEqual({ status: "locked" });
      const [acc] = await tx.select().from(adminAccounts).where(eq(adminAccounts.username, "koopa"));
      const log = await tx.select().from(auditLog).where(eq(auditLog.entityId, acc.id));
      expect(log.map((l) => l.action)).toContain("admin_locked");
      // Bloqueada, ni con la contraseña buena; a los 15 minutos vuelve a dejar.
      const { password } = await resetAdminPassword(tx, "koopa");
      expect(await startAdminLogin(tx, bot, { username: "koopa", password, now: T0 })).toMatchObject({ status: "ok" });
    });
  });

  it("test_s024_rf14_usuario_inexistente_responde_igual_que_contrasena_mala", async () => {
    await inRollback(async (tx) => {
      expect(await startAdminLogin(tx, new FakeBot(), { username: "nadie", password: "x", now: T0 })).toEqual({ status: "invalid" });
    });
  });

  it("test_s024_con_grupo_del_equipo_el_codigo_llega_solo_al_grupo_sin_vincular_chats", async () => {
    await inRollback(async (tx) => {
      const bot = new FakeBot();
      bot.teamChatId = "-5561816431";
      const { password } = await createAdminAccount(tx, "koopa");
      const s1 = await startAdminLogin(tx, bot, { username: "koopa", password, now: T0 });
      const pending = (s1 as { pending: string }).pending;
      // Sin chat personal: tras la contraseña nueva se pasa directo al código.
      const s2 = await changeAdminPassword(tx, bot, { pending, newPassword: "mi-contraseña-nueva-larga", now: T0 });
      expect(s2).toMatchObject({ status: "ok", next: "code" });
      expect(bot.sent).toHaveLength(1);
      expect(bot.sent[0].chatId).toBe("-5561816431");
      // El mensaje es solo el código.
      expect(bot.sent[0].text).toMatch(/^\d{6}$/);
      const r = await verifyAdminCode(tx, { pending, code: bot.sent[0].text, now: at(1), tg: bot });
      expect(r).toMatchObject({ status: "ok", username: "koopa" });
      expect(bot.sent.at(-1)).toEqual({ chatId: "-5561816431", text: "✅ koopa entró al panel" });
    });
  });

  it("test_s024_los_avisos_van_una_sola_vez_al_grupo_del_equipo", async () => {
    await inRollback(async (tx) => {
      const bot = new FakeBot();
      bot.teamChatId = "-100";
      await createAdminAccount(tx, "koopa");
      await createAdminAccount(tx, "bruno");
      await notifyAdmins(tx, bot, "hola");
      expect(bot.sent).toEqual([{ chatId: "-100", text: "hola" }]);
    });
  });

  it("test_s024_eliminar_una_cuenta_quita_el_rol_y_conserva_el_historial_pero_no_la_ultima", async () => {
    await inRollback(async (tx) => {
      await createAdminAccount(tx, "koopa");
      await expect(deleteAdminAccount(tx, "koopa")).rejects.toMatchObject({ code: "last_admin" });
      await createAdminAccount(tx, "bruno");
      const [acc] = await tx.select().from(adminAccounts).where(eq(adminAccounts.username, "bruno"));
      await deleteAdminAccount(tx, "bruno");
      expect(await tx.select().from(adminAccounts).where(eq(adminAccounts.username, "bruno"))).toHaveLength(0);
      const [u] = await tx.select().from(users).where(eq(users.id, acc.userId));
      expect(u.role).toBe("user");
      const log = await tx.select().from(auditLog).where(eq(auditLog.entityId, acc.id));
      expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["admin_account_create", "admin_account_delete"]));
      await expect(deleteAdminAccount(tx, "bruno")).rejects.toMatchObject({ code: "not_found" });
    });
  });
});
