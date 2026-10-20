"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claimDailyAction, claimFreePackAction, type RewardActionState } from "@/app/sobres/rewards-actions";
import { FREE_INTERVAL_MS } from "@/domain/rewards/free-packs";
import { PackArt, type PackArtData } from "@/features/packs/PackArt";
import { useCelebrations } from "@/features/rewards/celebrations";
import { sound } from "@/features/sound/engine";
import { useT } from "@/i18n/client";
import { Button } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { Alert } from "@/ui/feedback/Alert";
import { Select } from "@/ui/form/Select";
import { AnimatedCounter } from "@/ui/game/AnimatedCounter";
import { RingTimer } from "@/ui/game/RingTimer";
import { flights } from "@/ui/game/flight";
import { Sticker } from "@/ui/icons/Sticker";
import { cx } from "@/ui/variants";
import { Countdown } from "./Countdown";
import { STAMP_MS, StreakRow } from "./StreakRow";

type Reward = { kind: "cookies"; amount: number } | { kind: "pack" };

export interface RewardsDTO {
  serverNow: string;
  free: { charges: number; max: number; nextAt: string | null };
  daily: { claimedToday: boolean; day: number; schedule: Reward[]; atRisk: boolean };
  cookies: number;
  sets: { id: string; code: string; name: string; art: PackArtData }[];
  timeZoneCookie: string | null;
}

/** Spec 015, RF-16: error junto al botón; se puede reintentar solo si falló la red o algo inesperado. */
interface ClaimError {
  title: string;
  detail?: string;
  retry?: () => void;
}

const TZ_COOKIE = "wb_tz";
const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rectOf = (el: Element | null | undefined) => el?.getBoundingClientRect() ?? null;
/** Si no se encuentra de dónde sale el premio, sale del centro de la pantalla. */
const centerRect = () => ({ x: window.innerWidth / 2 - 20, y: window.innerHeight / 2 - 20, width: 40, height: 40 });

function ClaimErrorView({ error, retryLabel }: { error: ClaimError | null; retryLabel: string }) {
  if (!error) return null;
  return (
    <div data-testid="claim-error">
      <Alert
        tone="danger"
        title={error.title}
        actions={
          error.retry && (
            <Button size="sm" variant="secondary" onClick={error.retry} data-testid="claim-retry">
              {retryLabel}
            </Button>
          )
        }
      >
        {error.detail}
      </Alert>
    </div>
  );
}

function SetSelect({ sets, value, onChange, label }: { sets: RewardsDTO["sets"]; value: string; onChange: (v: string) => void; label: string }) {
  return <Select label={label} value={value} onValueChange={onChange} options={sets.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} className="min-w-56 flex-1" />;
}

/**
 * Spec 009: sobre gratis con espera (RF-4, RF-5) y racha diaria (RF-9, RF-15). Spec 015: el premio se ve, no se
 * avisa: la pegatina del día se estampa, las galletas vuelan al contador y el sobre a la navegación; el día 7 se
 * celebra; los errores van junto al botón y los lectores de pantalla reciben un anuncio.
 */
export function RewardsPanel({ data, layout = "grid" }: { data: RewardsDTO; layout?: "grid" | "stack" }) {
  const all = useT();
  const t = all.rewards;
  const fx = t.fx;
  const router = useRouter();
  const { celebrate } = useCelebrations();
  const root = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [stamping, setStamping] = useState<number | null>(null);
  const [freeError, setFreeError] = useState<ClaimError | null>(null);
  const [dailyError, setDailyError] = useState<ClaimError | null>(null);
  const [announce, setAnnounce] = useState("");
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
  const setOf = (id: string) => data.sets.find((s) => s.id === id);
  const query = (sel: string) => root.current?.querySelector(sel);

  /** Llama a la acción. Un «no» del servidor se muestra tal cual; un fallo de red o inesperado permite reintentar. */
  async function call(action: () => Promise<RewardActionState>, setError: (e: ClaimError | null) => void, retry: () => void) {
    setError(null);
    setBusy(true);
    try {
      const r = await action();
      if (!r.ok) {
        setError({ title: r.error });
        return null;
      }
      return r.reward;
    } catch {
      setError({ title: fx.failed, detail: fx.failedDetail, retry });
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** RF-2: el sobre vuela hasta «Mis sobres», suena al aterrizar y entonces llegan los contadores nuevos. */
  async function packLands(from: DOMRect | { x: number; y: number; width: number; height: number } | null) {
    setAnnounce(fx.sr.gotPack);
    await flights.fly({ from: from ?? centerRect(), to: "packs", sticker: "pack" });
    sound.play("pack");
    router.refresh();
  }

  const claimFree = async () => {
    const from = rectOf(query('[data-testid="free-claim"]'));
    const reward = await call(() => claimFreePackAction(freeSet), setFreeError, () => void claimFree());
    if (reward) await packLands(from);
  };

  const claimToday = async () => {
    const reward = await call(() => claimDailyAction(browserTz(), isPackDay ? dailySet : undefined), setDailyError, () => void claimToday());
    if (!reward) return;
    const day = reward.day ?? data.daily.day;
    // RF-10: primero se estampa la pegatina de hoy; de ella sale el premio.
    setStamping(day);
    await sleep(STAMP_MS);
    const from = rectOf(query(`[data-day-sticker="${day}"]`));
    if (reward.kind === "cookies") {
      // RF-1: las galletas vuelan al contador y, al llegar, suena y sube el marcador.
      setAnnounce(fx.sr.gotCookies(reward.amount, reward.cookies));
      await flights.fly({ from: from ?? centerRect(), to: "cookies", sticker: "cookie", count: 3 });
      sound.play("cookies");
      setStamping(null);
      router.refresh();
      return;
    }
    // RF-5: día 7, celebración; al cerrarla, el sobre vuela a la navegación y la racha empieza de nuevo.
    const set = setOf(reward.setId);
    setAnnounce(fx.sr.gotPack);
    setStamping(null);
    celebrate({
      key: `streak:${Date.now()}`,
      kicker: fx.streak.kicker,
      kickerTone: "mint",
      title: fx.streak.title,
      detail: fx.streak.detail(set?.name ?? ""),
      art: set ? <PackArt setId={set.id} code={set.code} name={set.name} art={set.art} className="w-[min(180px,26dvh)]" /> : <Sticker name="pack" className="size-32" />,
      onClosed: () => void packLands(rectOf(document.querySelector('[data-testid="celebration-dialog"]'))),
    });
  };

  return (
    <section ref={root} className={`grid gap-4 ${layout === "grid" ? "md:grid-cols-2" : ""}`} data-testid="rewards">
      {/* RF-15: el premio se anuncia a los lectores de pantalla; a la vista solo se ve volar. */}
      <p className="sr-only" aria-live="polite" data-testid="reward-announce">
        {announce}
      </p>
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
            {/* RF-2: la carga gastada se apaga encogiéndose. */}
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: data.free.max }, (_, i) => (
                <Sticker key={i} name="pack" className={cx("size-9 transition-[opacity,filter,transform] duration-500 motion-reduce:transition-none", i >= data.free.charges && "scale-75 opacity-30 grayscale")} />
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
            <Button width="full" disabled={busy || data.free.charges < 1} onClick={() => void claimFree()} data-testid="free-claim">
              {t.free.claim}
            </Button>
          </div>
        )}
        <ClaimErrorView error={freeError} retryLabel={fx.retry} />
      </Card>

      <Card className="space-y-4" data-testid="daily">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1 font-display text-lg font-semibold">
            <Sticker name="streak" className="size-9" />
            {t.daily.title}
          </h2>
          {/* RF-1 y RF-3: destino de las galletas que vuelan; el contador sube como un marcador. */}
          <span className="flex items-center gap-1 rounded-full border border-k-limon/40 bg-ui-raised py-1 pl-1 pr-3 text-sm font-black tabular-nums" data-fly-target="cookies">
            <Sticker name="cookie" className="size-7" />
            <AnimatedCounter value={data.cookies} format={t.cookies.balance} data-testid="cookie-balance" />
          </span>
        </div>
        {/* Spec 014, RF-17: la racha como pegatinas por día; spec 015: se estampa y late en el día de gracia. */}
        <StreakRow schedule={data.daily.schedule} day={data.daily.day} claimedToday={data.daily.claimedToday} stamping={stamping} atRisk={data.daily.atRisk} />
        {data.daily.claimedToday ? (
          <p className="text-sm text-ui-text-2">{t.daily.claimed}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            {isPackDay && !noSets && <SetSelect sets={data.sets} value={dailySet} onChange={setDailySet} label={t.daily.chooseSetForPack} />}
            <Button width="full" disabled={busy || (isPackDay && noSets)} onClick={() => void claimToday()} data-testid="daily-claim">
              {t.daily.claim}
            </Button>
          </div>
        )}
        {data.daily.atRisk && !data.daily.claimedToday ? (
          <p className="text-xs font-black text-ui-warning-text" data-testid="streak-risk">
            {fx.streak.atRisk}
          </p>
        ) : (
          <p className="text-xs text-ui-text-3">{t.daily.graceHint}</p>
        )}
        <ClaimErrorView error={dailyError} retryLabel={fx.retry} />
      </Card>
    </section>
  );
}
