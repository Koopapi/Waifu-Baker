import { describe, expect, it } from "vitest";
import { DAILY_SCHEDULE, checkDailyClaim, dailyStatus, daysBetween, localDay, safeTimeZone, type DailyState } from "./daily";

const fresh: DailyState = { streakDay: 0, lastDay: null, lastAt: null, lastTimeZone: null };

describe("spec 009 — recompensa diaria", () => {
  it("test_s009_rf9_dias_1_a_6_dan_galletas_y_el_7_un_sobre", () => {
    expect(DAILY_SCHEDULE.map((r) => (r.kind === "cookies" ? r.amount : "sobre"))).toEqual([10, 10, 15, 15, 20, 20, "sobre"]);
    expect(checkDailyClaim(fresh, new Date(), "UTC")).toMatchObject({ ok: true, day: 1, reward: { kind: "cookies", amount: 10 } });
  });

  it("test_s009_rf10_el_dia_cambia_a_la_medianoche_de_cada_usuario", () => {
    const now = new Date("2026-10-16T03:30:00Z");
    expect(localDay(now, "UTC")).toBe("2026-10-16");
    expect(localDay(now, "America/Mexico_City")).toBe("2026-10-15");
    expect(localDay(now, "Asia/Tokyo")).toBe("2026-10-16");
    expect(safeTimeZone("Marte/Olympus")).toBe("UTC");
    expect(localDay(now, "Marte/Olympus")).toBe("2026-10-16");
    const s = { ...fresh, streakDay: 1, lastDay: "2026-10-15", lastAt: new Date("2026-10-15T20:00:00Z"), lastTimeZone: "America/Mexico_City" };
    expect(checkDailyClaim(s, now, "America/Mexico_City")).toEqual({ ok: false, code: "already_claimed_today" });
  });

  it("test_s009_rf11_cambiar_de_zona_no_da_dos_premios_en_menos_de_20_horas", () => {
    const s = { streakDay: 1, lastDay: "2026-10-15", lastAt: new Date("2026-10-15T20:00:00Z"), lastTimeZone: "America/Mexico_City" };
    expect(checkDailyClaim(s, new Date("2026-10-16T03:30:00Z"), "Asia/Tokyo")).toEqual({ ok: false, code: "tz_change_too_soon" });
    expect(checkDailyClaim(s, new Date("2026-10-16T16:30:00Z"), "Asia/Tokyo")).toMatchObject({ ok: true, day: 2 });
  });

  it("test_s009_rf12_al_dia_siguiente_o_con_un_dia_de_hueco_la_racha_avanza", () => {
    const s = { ...fresh, streakDay: 3, lastDay: "2026-10-15" };
    expect(dailyStatus(s, "2026-10-16")).toEqual({ claimedToday: false, day: 4 });
    expect(dailyStatus(s, "2026-10-17")).toEqual({ claimedToday: false, day: 4 });
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("test_s009_rf13_dos_dias_seguidos_sin_reclamar_reinician_la_racha", () => {
    expect(dailyStatus({ ...fresh, streakDay: 5, lastDay: "2026-10-15" }, "2026-10-18")).toEqual({ claimedToday: false, day: 1 });
  });

  it("test_s009_rf14_tras_el_dia_7_empieza_una_racha_nueva", () => {
    expect(dailyStatus({ ...fresh, streakDay: 7, lastDay: "2026-10-15" }, "2026-10-16")).toEqual({ claimedToday: false, day: 1 });
    expect(checkDailyClaim({ ...fresh, streakDay: 6, lastDay: "2026-10-15" }, new Date("2026-10-16T12:00:00Z"), "UTC")).toMatchObject({ day: 7, reward: { kind: "pack" } });
  });
});
