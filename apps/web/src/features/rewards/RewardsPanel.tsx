"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimDailyAction, claimFreePackAction, type RewardActionState } from "@/app/sobres/rewards-actions";
import { useT } from "@/i18n/client";
import { useToast } from "@/features/ui/Toast";
import { Countdown } from "./Countdown";

type Reward = { kind: "cookies"; amount: number } | { kind: "pack" };

export interface RewardsDTO {
  serverNow: string;
  free: { charges: number; max: number; nextAt: string | null };
  daily: { claimedToday: boolean; day: number; schedule: Reward[] };
  cookies: number;
  sets: { id: string; code: string; name: string }[];
  timeZoneCookie: string | null;
}

const TZ_COOKIE = "wb_tz";
const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function Status({ state }: { state: RewardActionState | null }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm ${state.error ? "text-red-300" : "text-emerald-300"}`}>
      {state.error ?? state.message}
    </p>
  );
}

function SetSelect({ sets, value, onChange, label }: { sets: RewardsDTO["sets"]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-ui-line bg-ui-rail px-3 py-1.5" aria-label={label}>
        {sets.map((s) => (
          <option key={s.id} value={s.id} className="bg-ui-nav">
            {s.code} · {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Spec 009: sobre gratis con espera (RF-4, RF-5) y racha diaria (RF-9, RF-15). */
export function RewardsPanel({ data, layout = "grid" }: { data: RewardsDTO; layout?: "grid" | "stack" }) {
  const all = useT();
  const t = all.rewards;
  const toast = useToast();
  // RF-8 (spec 010): además del mensaje junto al botón, un aviso emergente.
  const notify = (s: RewardActionState) =>
    toast(s.error ? { kind: "error", title: all.common.toast.failed } : { kind: "success", title: all.common.toast.rewardClaimed });
  const router = useRouter();
  const [pending, start] = useTransition();
  const [freeState, setFreeState] = useState<RewardActionState | null>(null);
  const [dailyState, setDailyState] = useState<RewardActionState | null>(null);
  const [freeSet, setFreeSet] = useState(data.sets[0]?.id ?? "");
  const [dailySet, setDailySet] = useState(data.sets[0]?.id ?? "");

  // La zona horaria del navegador decide cuándo cambia el día (RF-10); el servidor la lee de una cookie.
  useEffect(() => {
    const tz = browserTz();
    if (data.timeZoneCookie !== tz) {
      document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [data.timeZoneCookie, router]);

  const noSets = data.sets.length === 0;
  const isPackDay = data.daily.schedule[data.daily.day - 1]?.kind === "pack";

  return (
    <section className={`grid gap-4 ${layout === "grid" ? "md:grid-cols-2" : ""}`} data-testid="rewards">
      <div className="space-y-3 rounded-xl bg-ui-nav p-5" data-testid="free-pack">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{t.free.title}</h2>
          <span className="text-sm tabular-nums text-ui-text-2" data-testid="free-charges">
            {t.free.ready(data.free.charges, data.free.max)}
          </span>
        </div>
        <p className="text-sm text-ui-text-2">
          {data.free.nextAt ? (
            <>
              {t.free.nextIn} <Countdown until={data.free.nextAt} serverNow={data.serverNow} />
            </>
          ) : (
            t.free.full
          )}
        </p>
        {noSets ? (
          <p className="text-sm text-ui-text-3">{t.free.none}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <SetSelect sets={data.sets} value={freeSet} onChange={setFreeSet} label={t.free.chooseSet} />
            <button
              type="button"
              disabled={pending || data.free.charges < 1}
              onClick={() =>
                start(async () => {
                  const r = await claimFreePackAction(freeSet);
                  setFreeState(r);
                  notify(r);
                })
              }
              className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-4 py-2 text-sm font-semibold text-ui-on-accent disabled:opacity-40"
            >
              {t.free.claim}
            </button>
          </div>
        )}
        <Status state={freeState} />
      </div>

      <div className="space-y-3 rounded-xl bg-ui-nav p-5" data-testid="daily">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{t.daily.title}</h2>
          <span className="text-sm tabular-nums text-ui-text-2" data-testid="cookie-balance">
            {t.cookies.balance(data.cookies)}
          </span>
        </div>
        <ol className={`grid gap-1.5 ${layout === "stack" ? "grid-cols-4" : "grid-cols-7"}`} data-testid="streak">
          {data.daily.schedule.map((r, i) => {
            const day = i + 1;
            const done = data.daily.claimedToday ? day <= data.daily.day : day < data.daily.day;
            const current = !data.daily.claimedToday && day === data.daily.day;
            return (
              <li
                key={day}
                data-day={day}
                data-state={done ? "done" : current ? "current" : "next"}
                className={`rounded-lg border px-1 py-2 text-center text-[11px] leading-tight ${
                  current ? "border-ui-accent bg-ui-accent/15" : done ? "border-ui-success/50 bg-ui-success/15" : "border-ui-line"
                }`}
              >
                <span className="block font-semibold">{t.daily.day(day)}</span>
                <span className="block text-ui-text-2">{r.kind === "cookies" ? t.daily.cookies(r.amount) : t.daily.pack}</span>
              </li>
            );
          })}
        </ol>
        {data.daily.claimedToday ? (
          <p className="text-sm text-ui-text-2">{t.daily.claimed}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {isPackDay && !noSets && <SetSelect sets={data.sets} value={dailySet} onChange={setDailySet} label={t.daily.chooseSetForPack} />}
            <button
              type="button"
              disabled={pending || (isPackDay && noSets)}
              onClick={() =>
                start(async () => {
                  const r = await claimDailyAction(browserTz(), isPackDay ? dailySet : undefined);
                  setDailyState(r);
                  notify(r);
                })
              }
              className="btn rounded-md bg-ui-accent hover:bg-ui-accent-hover px-4 py-2 text-sm font-semibold text-ui-on-accent disabled:opacity-40"
            >
              {t.daily.claim}
            </button>
          </div>
        )}
        <p className="text-xs text-ui-text-3">{t.daily.graceHint}</p>
        <Status state={dailyState} />
      </div>
    </section>
  );
}
