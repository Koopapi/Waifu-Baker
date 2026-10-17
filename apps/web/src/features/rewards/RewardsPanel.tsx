"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimDailyAction, claimFreePackAction, type RewardActionState } from "@/app/sobres/rewards-actions";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { Alert } from "@/ui/feedback/Alert";
import { useToast } from "@/ui/feedback/Toast";
import { Select } from "@/ui/form/Select";
import { FREE_INTERVAL_MS } from "@/domain/rewards/free-packs";
import { RingTimer } from "@/ui/game/RingTimer";
import { Sticker } from "@/ui/icons/Sticker";
import { Countdown } from "./Countdown";
import { StreakRow } from "./StreakRow";

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
  return <Alert tone={state.error ? "danger" : "success"}>{state.error ?? state.message}</Alert>;
}

function SetSelect({ sets, value, onChange, label }: { sets: RewardsDTO["sets"]; value: string; onChange: (v: string) => void; label: string }) {
  return <Select label={label} value={value} onValueChange={onChange} options={sets.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} className="min-w-56 flex-1" />;
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
      <Card className="space-y-4" data-testid="free-pack">
        {/* Spec 014, RF-16: temporizador en anillo que se llena hasta el siguiente sobre gratis. */}
        <div className="flex items-center gap-4">
          {data.free.nextAt ? (
            <RingTimer until={data.free.nextAt} serverNow={data.serverNow} totalMs={FREE_INTERVAL_MS} label={t.free.nextIn}>
              <span className="block font-display text-xl font-semibold">
                <Countdown until={data.free.nextAt} serverNow={data.serverNow} compact />
              </span>
              <span className="block text-[11px] font-extrabold text-ui-text-3">{t.free.nextShort}</span>
            </RingTimer>
          ) : (
            <div className="grid size-32 shrink-0 place-items-center rounded-full border-[9px] border-k-menta">
              <Sticker name="pack" className="size-14" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="flex items-center gap-1 font-display text-lg font-semibold">
              <Sticker name="clock" className="size-8" />
              {t.free.title}
            </h2>
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: data.free.max }, (_, i) => (
                <Sticker key={i} name="pack" className={i < data.free.charges ? "size-9" : "size-9 opacity-30 grayscale"} />
              ))}
            </div>
            <p className="text-sm font-black text-ui-success-text tabular-nums" data-testid="free-charges">
              {t.free.ready(data.free.charges, data.free.max)}
            </p>
            {!data.free.nextAt && <p className="text-xs text-ui-text-3">{t.free.full}</p>}
          </div>
        </div>
        {noSets ? (
          <p className="text-sm text-ui-text-3">{t.free.none}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <SetSelect sets={data.sets} value={freeSet} onChange={setFreeSet} label={t.free.chooseSet} />
            <Button
              width="full"
              disabled={pending || data.free.charges < 1}
              onClick={() =>
                start(async () => {
                  const r = await claimFreePackAction(freeSet);
                  setFreeState(r);
                  notify(r);
                })
              }
            >
              {t.free.claim}
            </Button>
          </div>
        )}
        <Status state={freeState} />
      </Card>

      <Card className="space-y-4" data-testid="daily">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1 font-display text-lg font-semibold">
            <Sticker name="streak" className="size-9" />
            {t.daily.title}
          </h2>
          <span className="flex items-center gap-1 rounded-full border border-k-limon/40 bg-ui-raised py-1 pl-1 pr-3 text-sm font-black tabular-nums">
            <Sticker name="cookie" className="size-7" />
            <span data-testid="cookie-balance">{t.cookies.balance(data.cookies)}</span>
          </span>
        </div>
        {/* Spec 014, RF-17: la racha como pegatinas por día, sin textos que se salgan. */}
        <StreakRow schedule={data.daily.schedule} day={data.daily.day} claimedToday={data.daily.claimedToday} />
        {data.daily.claimedToday ? (
          <p className="text-sm text-ui-text-2">{t.daily.claimed}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            {isPackDay && !noSets && <SetSelect sets={data.sets} value={dailySet} onChange={setDailySet} label={t.daily.chooseSetForPack} />}
            <Button
              width="full"
              disabled={pending || (isPackDay && noSets)}
              onClick={() =>
                start(async () => {
                  const r = await claimDailyAction(browserTz(), isPackDay ? dailySet : undefined);
                  setDailyState(r);
                  notify(r);
                })
              }
            >
              {t.daily.claim}
            </Button>
          </div>
        )}
        <p className="text-xs text-ui-text-3">{t.daily.graceHint}</p>
        <Status state={dailyState} />
      </Card>
    </section>
  );
}
