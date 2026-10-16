// Spec 009, RF-9 a RF-14: recompensa diaria con racha de 7 días y un día de gracia. Puro.
export type DailyReward = { kind: "cookies"; amount: number } | { kind: "pack" };

export const DAILY_SCHEDULE: DailyReward[] = [
  { kind: "cookies", amount: 10 },
  { kind: "cookies", amount: 10 },
  { kind: "cookies", amount: 15 },
  { kind: "cookies", amount: 15 },
  { kind: "cookies", amount: 20 },
  { kind: "cookies", amount: 20 },
  { kind: "pack" },
];
export const TZ_CHANGE_MIN_MS = 20 * 60 * 60 * 1000;

/** Zona horaria IANA válida, o UTC (caso límite de la spec). */
export function safeTimeZone(tz: string | null | undefined) {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** RF-10: el día (AAAA-MM-DD) en la zona horaria del usuario. */
export function localDay(now: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: safeTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Días de calendario entre dos días AAAA-MM-DD. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export interface DailyState {
  /** Último día de racha reclamado (0 = ninguno). */
  streakDay: number;
  lastDay: string | null;
  lastAt: Date | null;
  lastTimeZone: string | null;
}

/**
 * Qué día de racha toca hoy. Con 1 o 2 días desde el último reclamo la racha sigue (2 = día de
 * gracia, RF-12); con 3 o más vuelve al 1 (RF-13); tras el día 7 empieza otra (RF-14).
 */
export function dailyStatus(s: DailyState, today: string) {
  if (s.lastDay === today) return { claimedToday: true, day: s.streakDay };
  const gap = s.lastDay ? daysBetween(s.lastDay, today) : Infinity;
  const continues = gap >= 1 && gap <= 2 && s.streakDay >= 1 && s.streakDay < 7;
  return { claimedToday: false, day: continues ? s.streakDay + 1 : 1 };
}

export type ClaimCheck = { ok: true; day: number; reward: DailyReward } | { ok: false; code: "already_claimed_today" | "tz_change_too_soon" };

/** RF-10 y RF-11: se puede reclamar hoy, y un cambio de zona no permite dos premios en menos de 20 h. */
export function checkDailyClaim(s: DailyState, now: Date, timeZone: string): ClaimCheck {
  const tz = safeTimeZone(timeZone);
  const st = dailyStatus(s, localDay(now, tz));
  if (st.claimedToday) return { ok: false, code: "already_claimed_today" };
  if (s.lastAt && s.lastTimeZone && s.lastTimeZone !== tz && now.getTime() - s.lastAt.getTime() < TZ_CHANGE_MIN_MS) {
    return { ok: false, code: "tz_change_too_soon" };
  }
  return { ok: true, day: st.day, reward: DAILY_SCHEDULE[st.day - 1] };
}
