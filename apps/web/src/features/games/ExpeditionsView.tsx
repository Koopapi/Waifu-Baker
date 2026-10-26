"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cancelExpeditionAction,
  choosePackSetAction,
  claimExpeditionAction,
  sendExpeditionAction,
  unlockZoneAction,
} from "@/app/(app)/juegos/expediciones/actions";
import type { ExpeditionResult } from "@/db/schema";
import type { Rarity } from "@/domain/catalog/card-rules";
import { BOND_XP, type DurationMin, type Rating, type Role, type Terrain, type ZoneLoot } from "@/domain/expeditions/rules";
import { PackArt, type PackArtData } from "@/features/packs/PackArt";
import { useCelebrations } from "@/features/rewards/celebrations";
import { Countdown } from "@/features/rewards/Countdown";
import { sound } from "@/features/sound/engine";
import { useLocale, useT } from "@/i18n/client";
import { formatPercent } from "@/i18n/format";
import { renderPhrase, useGamesT } from "@/i18n/games";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { Select } from "@/ui/form/Select";
import { flights } from "@/ui/game/flight";
import { Sticker } from "@/ui/icons/Sticker";
import { useConfirm } from "@/ui/overlay/Confirm";
import { Modal } from "@/ui/overlay/Modal";
import { cx } from "@/ui/variants";
import { PreparePanel } from "./PreparePanel";
import "./expeditions.css";

export interface ZoneDTO {
  id: string;
  name: string;
  terrain: Terrain;
  difficulty: number;
  fragmentsRequired: number;
  open: boolean;
  loot: ZoneLoot;
  image: string | null;
}
export interface PickCardDTO {
  cardId: string;
  holo: boolean;
  name: string;
  number: number;
  rarity: Rarity;
  setCode: string;
  characterId: string | null;
  characterName: string | null;
  terrain: Terrain | null;
  role: Role | null;
  bondLevel: number;
  busyUntil: string | null;
  thumb: string;
}
export interface ExpeditionDTO {
  id: string;
  zoneId: string;
  zoneName: string;
  durationMin: number;
  endsAt: string;
  rating: Rating;
  team: { cardId: string; holo: boolean; name: string; characterId: string | null }[];
}
export interface ExpeditionsDTO {
  serverNow: string;
  profile: { fragments: number; completed: number };
  slots: number;
  /** Spec 021, RF-13 y RF-15: el patron tiene 3 espacios; a los demás se les dice cómo. */
  patron: boolean;
  patreonUrl: string;
  zones: ZoneDTO[];
  expeditions: ExpeditionDTO[];
  pendingPacks: { id: string; zoneName: string }[];
  cards: PickCardDTO[];
  sets: { id: string; code: string; name: string; art: PackArtData }[];
}

/** Sitios de las zonas en el mapa (en %), por orden; el mapa es decorativo y no depende de coordenadas guardadas. */
const PINS: [number, number][] = [
  [18, 74],
  [44, 44],
  [76, 76],
  [78, 22],
  [20, 26],
  [52, 14],
  [50, 86],
  [90, 50],
];
const TERRAIN_ICON: Record<Terrain, string> = { city: "🏙", forest: "🌲", coast: "🌊", ruins: "🏛", mountain: "🏔" };

const centerRect = () => ({ x: window.innerWidth / 2 - 20, y: window.innerHeight / 2 - 20, width: 40, height: 40 });

/** Spec 020: Expediciones. El servidor decide todo; aquí solo se arma el equipo, se manda y se enseña lo que pasó. */
export function ExpeditionsView({ data }: { data: ExpeditionsDTO }) {
  const t = useGamesT();
  const tc = useT();
  const locale = useLocale();
  const router = useRouter();
  const confirm = useConfirm();
  const { celebrate } = useCelebrations();
  const [prepare, setPrepare] = useState<ZoneDTO | null>(null);
  const [report, setReport] = useState<{ expedition: ExpeditionDTO; result: ExpeditionResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");

  const outByZone = useMemo(() => new Map(data.expeditions.map((e) => [e.zoneId, e])), [data.expeditions]);
  const fog = data.zones.filter((z) => !z.open);
  const pct = (x: number) => formatPercent(locale, Math.round(x * 10_000) / 100);

  async function act<T>(fn: () => Promise<{ ok: true; value: T } | { ok: false; error: string }>) {
    setError(null);
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) {
        setError(r.error);
        return null;
      }
      return r.value;
    } catch {
      setError(tc.rewards.fx.failed);
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** RF-22: el sobre ganado se celebra como los que llegan sin pedirlos y vuela a «Mis sobres». */
  function celebratePack(setId: string | null) {
    const set = data.sets.find((s) => s.id === setId) ?? (data.sets.length === 1 ? data.sets[0] : undefined);
    celebrate({
      key: `expedition-pack:${Date.now()}`,
      kicker: t.report.packKicker,
      kickerTone: "lemon",
      title: t.report.packTitle,
      detail: set?.name,
      art: set ? <PackArt setId={set.id} code={set.code} name={set.name} art={set.art} className="w-[min(180px,26dvh)]" /> : <Sticker name="pack" className="size-32" />,
      onClosed: async () => {
        await flights.fly({ from: document.querySelector('[data-testid="celebration-dialog"]')?.getBoundingClientRect() ?? centerRect(), to: "packs", sticker: "pack" });
        sound.play("pack");
        router.refresh();
      },
    });
  }

  async function claim(e: ExpeditionDTO) {
    const result = await act(() => claimExpeditionAction(e.id));
    if (!result) return;
    setAnnounce(t.report.srClaimed(result.loot.cookies, result.loot.fragments));
    setReport({ expedition: e, result });
  }

  async function closeReport() {
    const r = report;
    setReport(null);
    if (!r) return;
    if (r.result.loot.cookies > 0) {
      await flights.fly({ from: centerRect(), to: "cookies", sticker: "cookie", count: 3 });
      sound.play("cookies");
    }
    if (r.result.packWon && r.result.packId) celebratePack(null);
    router.refresh();
  }

  async function cancel(e: ExpeditionDTO) {
    const ok = await confirm({ title: t.expeditions.cancelTitle(e.zoneName), body: t.expeditions.cancelBody, confirmLabel: t.expeditions.cancelConfirm, tone: "danger" });
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      const r = await cancelExpeditionAction(e.id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    } catch {
      setError(tc.rewards.fx.failed);
    } finally {
      setBusy(false);
    }
  }

  async function unlock(z: ZoneDTO) {
    const r = await act(() => unlockZoneAction(z.id));
    if (r) {
      setAnnounce(t.expeditions.unlocked(z.name));
      router.refresh();
    }
  }

  async function takePack(expeditionId: string, setId: string) {
    const r = await act(() => choosePackSetAction(expeditionId, setId));
    if (!r) return false;
    setReport(null);
    celebratePack(setId);
    return true;
  }

  const noCards = data.cards.length === 0;

  return (
    <div className="space-y-6" data-testid="expeditions">
      <p className="sr-only" aria-live="polite" data-testid="expedition-announce">
        {announce}
      </p>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          <Sticker name="map" className="size-10" />
          {t.expeditions.title}
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ui-line bg-ui-raised px-3 py-1 text-sm font-black tabular-nums" data-testid="fragments">
          🧭 {t.expeditions.fragments(data.profile.fragments)}
        </span>
      </header>

      {error && (
        <div data-testid="expedition-error">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {data.zones.length === 0 ? (
        <Alert tone="info">{t.expeditions.noZones}</Alert>
      ) : (
        <section aria-label={t.expeditions.mapLabel} className="xmap" data-testid="expedition-map">
          <svg aria-hidden className="xmap__paths" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M18 74 C 30 60, 32 48, 44 44 S 70 30, 78 22 M44 44 C 56 56, 66 66, 76 76 M44 44 C 34 36, 26 30, 20 26 M78 22 C 70 18, 60 16, 52 14" />
          </svg>
          {data.zones.map((z, i) => {
            const [x, y] = PINS[i % PINS.length];
            const out = outByZone.get(z.id);
            const state = !z.open ? "fog" : out ? "out" : "open";
            return (
              <button
                key={z.id}
                type="button"
                className={cx("xmap__pin", `xmap__pin--${state}`, `xmap__pin--${z.terrain}`)}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => (z.open ? !noCards && setPrepare(z) : document.getElementById(`fog-${z.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))}
                aria-label={`${z.name} · ${t.terrain[z.terrain]}${z.open ? "" : ` · ${t.expeditions.zoneFog(data.profile.fragments, z.fragmentsRequired)}`}`}
                data-testid="zone-pin"
                data-zone={z.name}
                data-state={state}
              >
                <span className="xmap__dot" aria-hidden>
                  {z.open ? TERRAIN_ICON[z.terrain] : "☁"}
                </span>
                <span className="xmap__label">
                  <span className="xmap__name">{z.name}</span>
                  <span className="xmap__state">
                    {state === "fog" ? (
                      t.expeditions.zoneFog(data.profile.fragments, z.fragmentsRequired)
                    ) : out ? (
                      <Countdown until={out.endsAt} serverNow={data.serverNow} compact />
                    ) : (
                      t.terrain[z.terrain]
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {noCards ? (
        <Alert tone="info" title={t.expeditions.noCards}>
          <Link href="/sobres" className="font-semibold underline">
            {t.expeditions.goToPacks}
          </Link>
        </Alert>
      ) : (
        data.zones.length > 0 && <p className="text-sm text-ui-text-3">{t.expeditions.tapZone}</p>
      )}

      {data.pendingPacks.map((p) => (
        <PendingPack key={p.id} expeditionId={p.id} zoneName={p.zoneName} sets={data.sets} busy={busy} onTake={takePack} />
      ))}

      <section className="space-y-3" data-testid="teams">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">{t.expeditions.teams}</h2>
          <span className="text-sm text-ui-text-3" data-testid="slots">
            {t.expeditions.slots(data.expeditions.length, data.slots)}
          </span>
        </div>
        {data.expeditions.length === 0 && <p className="text-sm text-ui-text-3">{t.expeditions.noTeams}</p>}
        {!data.patron && (
          <div className="xteam opacity-90" data-testid="third-slot-locked">
            <span className="text-xl" aria-hidden>
              🔒
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t.expeditions.thirdSlot}</span>
              <span className="block text-xs text-ui-text-3">
                {t.expeditions.thirdSlotHint}{" "}
                <a href={data.patreonUrl} target="_blank" rel="noreferrer" className="font-bold text-ui-accent-text underline underline-offset-4" data-testid="patreon-link">
                  {t.expeditions.thirdSlotLink} →
                </a>
              </span>
            </span>
          </div>
        )}
        <ul className="space-y-2">
          {data.expeditions.map((e) => {
            const ready = new Date(e.endsAt).getTime() <= new Date(data.serverNow).getTime();
            return (
              <li key={e.id} className={cx("xteam", ready && "xteam--back")} data-testid="team" data-ready={ready ? "1" : "0"} data-zone={e.zoneName}>
                <span className="xteam__cards" aria-hidden>
                  {e.team.map((m) => (
                    <span key={`${m.cardId}:${m.holo}`} className={cx("xteam__card", m.holo && "holo-finish")}>
                      {m.name.slice(0, 1)}
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.zoneName}</span>
                  <span className={cx("block text-xs", ready ? "font-bold text-ui-success-text" : "text-ui-text-2")}>
                    {ready ? (
                      t.expeditions.back(t.rating[e.rating])
                    ) : (
                      <>
                        {t.duration(e.durationMin)} · {t.rating[e.rating]} · <Countdown until={e.endsAt} serverNow={data.serverNow} compact />
                      </>
                    )}
                  </span>
                </span>
                {ready ? (
                  <Button size="sm" disabled={busy} onClick={() => void claim(e)} data-testid="claim">
                    {t.expeditions.claim}
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => void cancel(e)} data-testid="cancel">
                    {t.expeditions.cancel}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {fog.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t.expeditions.fogZones}</h2>
          <ul className="space-y-2">
            {fog.map((z) => {
              const can = data.profile.fragments >= z.fragmentsRequired;
              return (
                <li key={z.id} id={`fog-${z.id}`} className="xteam" data-testid="fog-zone" data-zone={z.name}>
                  <span className="text-2xl" aria-hidden>
                    ☁
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{z.name}</span>
                    <span className="block text-xs text-ui-text-3">{t.expeditions.unlockHint(data.profile.fragments, z.fragmentsRequired)}</span>
                  </span>
                  <Button size="sm" variant="secondary" disabled={busy || !can} onClick={() => void unlock(z)} data-testid="unlock">
                    {t.expeditions.unlock}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {prepare && (
        <PreparePanel
          zone={prepare}
          cards={data.cards}
          serverNow={data.serverNow}
          slotsFree={data.slots - data.expeditions.length}
          busy={busy}
          error={error}
          pct={pct}
          onClose={() => {
            setPrepare(null);
            setError(null);
          }}
          onSend={async (input) => {
            const r = await act(() => sendExpeditionAction(input));
            if (!r) return;
            setAnnounce(t.prepare.sent(prepare.name));
            setPrepare(null);
            router.refresh();
          }}
        />
      )}

      {report && <ReportModal report={report} sets={data.sets} busy={busy} onClose={() => void closeReport()} onTake={takePack} />}
    </div>
  );
}

/** RF-22: un sobre ganado esperando colección (si se cerró el reporte sin elegir). */
function PendingPack({ expeditionId, zoneName, sets, busy, onTake }: { expeditionId: string; zoneName: string; sets: ExpeditionsDTO["sets"]; busy: boolean; onTake: (id: string, setId: string) => Promise<boolean> }) {
  const t = useGamesT();
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  return (
    <section className="xpack" data-testid="pending-pack">
      <p className="font-bold text-k-limon">
        📦 {t.expeditions.pendingPack} <span className="font-normal text-ui-text-2">({zoneName})</span>
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Select label={t.report.chooseSet} value={setId} onValueChange={setSetId} options={sets.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} className="min-w-56 flex-1" />
        <Button disabled={busy || !setId} onClick={() => void onTake(expeditionId, setId)} data-testid="take-pack">
          {t.report.takePack}
        </Button>
      </div>
    </section>
  );
}

/** RF-24: el reporte al reclamar: frases línea a línea, botín, vínculo y, si salió, el sobre. */
function ReportModal({
  report,
  sets,
  busy,
  onClose,
  onTake,
}: {
  report: { expedition: ExpeditionDTO; result: ExpeditionResult };
  sets: ExpeditionsDTO["sets"];
  busy: boolean;
  onClose: () => void;
  onTake: (id: string, setId: string) => Promise<boolean>;
}) {
  const t = useGamesT();
  const tc = useT();
  const { expedition: e, result: r } = report;
  const names = e.team.map((m) => m.name);
  const nameOf = (characterId: string) => e.team.find((m) => m.characterId === characterId)?.name ?? "";
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  const choosing = r.packWon && !r.packId;
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={e.zoneName} description={t.report.sub(t.duration(e.durationMin), t.rating[e.rating])} size="md" testId="expedition-report" closeLabel={tc.common.close}>
      <div className="space-y-4">
        <p className="text-xs font-black uppercase tracking-wider text-k-menta">{t.report.kicker}</p>
        <ol className="space-y-2 rounded-l border border-ui-line bg-ui-rail p-3" aria-label={t.report.phrasesLabel}>
          {r.phrases.map((p, i) => (
            <li key={p.key} className="xreport__line flex gap-2 text-sm" style={{ animationDelay: `${i * 450}ms` }} data-testid="report-phrase">
              <span aria-hidden className="text-k-limon">
                ✦
              </span>
              {renderPhrase(t, p.key, names, p.order, e.zoneName)}
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-l bg-ui-raised p-3">
            <p className="font-display text-2xl font-semibold tabular-nums" data-testid="report-cookies">
              +{r.loot.cookies}
            </p>
            <p className="text-xs text-ui-text-3">🍪 {t.report.cookies}</p>
          </div>
          <div className="rounded-l bg-ui-raised p-3">
            <p className="font-display text-2xl font-semibold tabular-nums" data-testid="report-fragments">
              +{r.loot.fragments}
            </p>
            <p className="text-xs text-ui-text-3">🧭 {t.report.fragments}</p>
          </div>
        </div>
        {r.bonds.length > 0 && (
          <div className="space-y-2" data-testid="report-bonds">
            <p className="text-xs font-semibold uppercase tracking-wide text-ui-text-2">{t.report.bond}</p>
            {r.bonds.map((b) => (
              <p key={b.characterId} className="flex justify-between text-sm">
                <span>{t.report.bondLine(nameOf(b.characterId), b.level, b.before)}</span>
                <span className="font-black text-k-chicle">{t.report.xp(BOND_XP[e.durationMin as DurationMin] ?? 0)}</span>
              </p>
            ))}
          </div>
        )}
        {r.packWon && (
          <div className="xpack" data-testid="report-pack">
            <p className="font-bold text-k-limon">📦 {t.report.packFound}</p>
            {choosing && (
              <div className="flex flex-wrap items-end gap-3">
                <Select label={t.report.chooseSet} value={setId} onValueChange={setSetId} options={sets.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))} className="min-w-56 flex-1" />
                <Button disabled={busy || !setId} onClick={() => void onTake(e.id, setId)} data-testid="take-pack">
                  {t.report.takePack}
                </Button>
              </div>
            )}
          </div>
        )}
        {!choosing && (
          <Button width="full" onClick={onClose} data-testid="report-done">
            {t.report.done}
          </Button>
        )}
      </div>
    </Modal>
  );
}
