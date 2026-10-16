import { describe, expect, it } from "vitest";
import { accountState, purgeDate } from "./lifecycle";

const now = new Date("2026-11-30T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("spec 001 — ciclo de vida de la cuenta", () => {
  it("test_s001_rf23_antes_de_30_dias_la_cuenta_desactivada_se_puede_recuperar", () => {
    expect(accountState({ deletedAt: null, purgedAt: null }, now)).toBe("active");
    expect(accountState({ deletedAt: daysAgo(29.9), purgedAt: null }, now)).toBe("deactivated");
  });

  it("test_s001_rf24_a_los_30_dias_toca_borrarla_de_forma_definitiva", () => {
    expect(accountState({ deletedAt: daysAgo(30), purgedAt: null }, now)).toBe("purge_due");
    expect(purgeDate(daysAgo(0)).toISOString()).toBe("2026-12-30T12:00:00.000Z");
  });

  it("test_s001_rf25_una_cuenta_borrada_no_vuelve", () => {
    expect(accountState({ deletedAt: daysAgo(40), purgedAt: daysAgo(10) }, now)).toBe("purged");
  });
});
