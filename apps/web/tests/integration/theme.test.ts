// Spec 026: el tema se guarda en la cuenta (RF-6 y RF-7) y se borra con ella.
import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { users } from "@/db/schema";
import { purgeAccount } from "@/server/services/account";
import { getThemeFor, setTheme } from "@/server/services/theme";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";

describe("tema de la cuenta", () => {
  it("test_s026_rf3_sin_sesion_o_sin_eleccion_es_kawaii", async () => {
    await inRollback(async (tx) => {
      expect(await getThemeFor(tx, null)).toBe("kawaii");
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:theme-a", displayName: "Tema A", role: "user" });
      expect(await getThemeFor(tx, fan.id)).toBe("kawaii");
      expect(await getThemeFor(tx, "00000000-0000-0000-0000-000000000000")).toBe("kawaii");
    });
  });

  it("test_s026_rf6_rf7_la_eleccion_se_guarda_en_la_cuenta", async () => {
    await inRollback(async (tx) => {
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:theme-b", displayName: "Tema B", role: "user" });
      expect(await setTheme(tx, fan.id, "street")).toBe("street");
      expect(await getThemeFor(tx, fan.id)).toBe("street");
      // Volver a entrar (otro dispositivo) no la pisa.
      await upsertUserFromLogin(tx, { patreonUserId: "dev:theme-b", displayName: "Tema B", role: "user" });
      expect(await getThemeFor(tx, fan.id)).toBe("street");
      await setTheme(tx, fan.id, "kawaii");
      expect(await getThemeFor(tx, fan.id)).toBe("kawaii");
    });
  });

  it("test_s026_rf6_rechaza_temas_desconocidos", async () => {
    await inRollback(async (tx) => {
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:theme-c", displayName: "Tema C", role: "user" });
      await expect(setTheme(tx, fan.id, "pastel")).rejects.toMatchObject({ code: "invalid_theme" });
      // La base de datos tampoco acepta otro valor.
      await expect(tx.transaction((sp) => sp.execute(sql`update users set theme = 'pastel' where id = ${fan.id}`))).rejects.toThrow();
    });
  });

  it("test_s026_la_purga_borra_la_eleccion", async () => {
    await inRollback(async (tx) => {
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:theme-d", displayName: "Tema D", role: "user" });
      await setTheme(tx, fan.id, "street");
      await purgeAccount(tx, fan.id);
      const [u] = await tx.select({ theme: users.theme }).from(users).where(eq(users.id, fan.id));
      expect(u.theme).toBe("kawaii");
    });
  });
});
