// Spec 010, RF-17 y RF-18: edad mínima configurable desde el panel.
import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditLog, users } from "@/db/schema";
import { needsAcceptance } from "@/domain/legal/documents";
import { getMinAge, setMinAge } from "@/server/services/settings";
import { acceptTerms } from "@/server/services/legal";
import { upsertUserFromLogin } from "@/server/services/users";
import { inRollback } from "./db";
import { makeAdmin } from "./factories";

describe("edad mínima", () => {
  it("test_s010_rf17_empieza_en_16_y_el_administrador_la_cambia_con_registro", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      expect(await getMinAge(tx)).toBe(16);
      await setMinAge(tx, admin.id, 18);
      expect(await getMinAge(tx)).toBe(18);
      const log = await tx.select().from(auditLog).where(and(eq(auditLog.action, "settings.min_age"), eq(auditLog.actorUserId, admin.id)));
      expect(log).toHaveLength(1);
      expect(log[0].before).toEqual({ minAge: 16 });
      expect(log[0].after).toEqual({ minAge: 18 });
    });
  });

  it("test_s010_rf17_rechaza_edades_que_no_son_16_ni_18", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      await expect(setMinAge(tx, admin.id, 17)).rejects.toMatchObject({ code: "invalid_min_age" });
    });
  });

  it("test_s010_rf18_quien_confirmo_16_debe_confirmar_18_al_subir_la_edad", async () => {
    await inRollback(async (tx) => {
      const admin = await makeAdmin(tx);
      const fan = await upsertUserFromLogin(tx, { patreonUserId: "dev:age-fan", displayName: "Age fan", role: "user" });
      await acceptTerms(tx, fan.id);
      let [u] = await tx.select().from(users).where(eq(users.id, fan.id));
      expect(u.ageConfirmedMin).toBe(16);
      await setMinAge(tx, admin.id, 18);
      expect(needsAcceptance(u, undefined, await getMinAge(tx))).toBe(true);
      await acceptTerms(tx, fan.id);
      [u] = await tx.select().from(users).where(eq(users.id, fan.id));
      expect(u.ageConfirmedMin).toBe(18);
      expect(needsAcceptance(u, undefined, await getMinAge(tx))).toBe(false);
    });
  });
});
