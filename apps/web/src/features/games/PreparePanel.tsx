"use client";

import { useMemo, useState } from "react";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { DURATIONS, ROLES, TEAM_MAX, TERRAINS, lootFor, rateTeam, teamPower, type DurationMin } from "@/domain/expeditions/rules";
import { useLocale, useT } from "@/i18n/client";
import { useGamesT } from "@/i18n/games";
import { Button } from "@/ui/action/Button";
import { Alert } from "@/ui/feedback/Alert";
import { Select } from "@/ui/form/Select";
import { Modal } from "@/ui/overlay/Modal";
import { cx } from "@/ui/variants";
import type { PickCardDTO, ZoneDTO } from "./ExpeditionsView";

const keyOf = (c: { cardId: string; holo: boolean }) => `${c.cardId}:${c.holo ? "holo" : "normal"}`;
const RATING_TONE = { hard: "xrating--hard", normal: "xrating--normal", good: "xrating--good", excellent: "xrating--excellent" } as const;

/**
 * Spec 020, RF-7 a RF-14: armar el equipo. La calificación y el botín se calculan aquí con las mismas reglas que usa el
 * servidor, solo para enseñarlos; al enviar, el servidor vuelve a calcularlo todo.
 */
export function PreparePanel({
  zone,
  cards,
  serverNow,
  slotsFree,
  busy,
  error,
  pct,
  onClose,
  onSend,
}: {
  zone: ZoneDTO;
  cards: PickCardDTO[];
  serverNow: string;
  slotsFree: number;
  busy: boolean;
  error: string | null;
  pct: (x: number) => string;
  onClose: () => void;
  onSend: (input: { zoneId: string; durationMin: number; cards: { cardId: string; holo: boolean }[] }) => Promise<void>;
}) {
  const t = useGamesT();
  const tc = useT();
  const locale = useLocale();
  const [team, setTeam] = useState<PickCardDTO[]>([]);
  const [duration, setDuration] = useState<DurationMin>(120);
  const [terrain, setTerrain] = useState("any");
  const [role, setRole] = useState("any");
  const [rarity, setRarity] = useState("any");

  const members = team.map((c) => ({ rarity: c.rarity, holo: c.holo, terrain: c.terrain, role: c.role, bondLevel: c.bondLevel }));
  const power = teamPower(members, zone.terrain);
  const rating = rateTeam(power, zone.difficulty);
  const roles = members.map((m) => m.role);
  const serverMs = new Date(serverNow).getTime();
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  // RF-10: primero las del terreno de la zona; luego por rareza, de mayor a menor.
  const shown = useMemo(() => {
    const rank = (r: Rarity) => RARITIES.indexOf(r);
    return cards
      .filter((c) => terrain === "any" || (terrain === "none" ? !c.terrain : c.terrain === terrain))
      .filter((c) => role === "any" || (role === "none" ? !c.role : c.role === role))
      .filter((c) => rarity === "any" || c.rarity === rarity)
      .sort((a, b) => Number(b.terrain === zone.terrain) - Number(a.terrain === zone.terrain) || rank(b.rarity) - rank(a.rarity) || a.setCode.localeCompare(b.setCode) || a.number - b.number);
  }, [cards, terrain, role, rarity, zone.terrain]);

  const toggle = (c: PickCardDTO) =>
    setTeam((cur) => (cur.some((x) => keyOf(x) === keyOf(c)) ? cur.filter((x) => keyOf(x) !== keyOf(c)) : cur.length >= TEAM_MAX ? cur : [...cur, c]));

  const barPct = Math.min(100, (power / Math.max(1, zone.difficulty * 1.6)) * 100);
  const markPct = Math.min(100, (1 / 1.6) * 100);

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={zone.name} description={`${t.terrain[zone.terrain]} · ${t.prepare.difficulty(zone.difficulty)}`} size="xl" testId="prepare" closeLabel={tc.common.close}>
      <div className="space-y-5">
        <p className="-mt-2 text-xs font-black uppercase tracking-wider text-ui-accent-text">{t.prepare.kicker}</p>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ui-text-2">{t.prepare.teamLabel}</p>
          <ol className="grid grid-cols-3 gap-3" data-testid="team-slots">
            {Array.from({ length: TEAM_MAX }, (_, i) => {
              const c = team[i];
              return (
                <li key={i} className={cx("xslot", !c && "xslot--empty")}>
                  {c ? (
                    <button type="button" className="xslot__card" onClick={() => toggle(c)} aria-label={t.prepare.remove(c.characterName ?? c.name)} data-testid="team-member">
                      {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                      <img src={c.thumb} alt="" className={cx("xslot__img", c.holo && "holo-finish")} />
                      <span className="xslot__name">{c.characterName ?? c.name}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-ui-text-3">{t.prepare.emptySlot}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="space-y-2 rounded-l bg-ui-raised p-3" data-testid="power">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-ui-text-2 tabular-nums" data-testid="power-value">
              {t.prepare.power(power, zone.difficulty)}
            </span>
            {team.length > 0 && (
              <span className={cx("xrating", RATING_TONE[rating])} data-testid="rating" data-rating={rating}>
                {t.rating[rating]}
              </span>
            )}
          </div>
          <div className="xbar" aria-hidden>
            <span className="xbar__fill" style={{ transform: `scaleX(${barPct / 100})` }} />
            <span className="xbar__mark" style={{ left: `${markPct}%` }} />
          </div>
          <p className="text-xs text-ui-text-3">{t.prepare.powerHint}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ui-text-2">{t.prepare.durations}</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.prepare.durations}>
            {DURATIONS.map((d) => {
              const loot = lootFor(zone.loot[`${d}`], rating, roles);
              const on = d === duration;
              return (
                <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setDuration(d)} className={cx("xdur", on && "xdur--on")} data-testid={`duration-${d}`}>
                  <span className="font-display text-base font-semibold">{t.duration(d)}</span>
                  <span className="text-xs text-ui-text-2" data-testid="loot-cookies">
                    {t.prepare.cookies(loot.cookies)}
                  </span>
                  <span className="text-xs text-ui-text-2">{t.prepare.fragments(loot.fragments)}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ui-text-3" data-testid="pack-chance">
            {t.prepare.packChance(pct(lootFor(zone.loot[`${duration}`], rating, roles).packChance))}
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label={t.prepare.filterTerrain}
              value={terrain}
              onValueChange={setTerrain}
              options={[{ value: "any", label: t.prepare.any }, ...TERRAINS.map((x) => ({ value: x, label: t.terrain[x] })), { value: "none", label: t.prepare.noTerrain }]}
            />
            <Select
              label={t.prepare.filterRole}
              value={role}
              onValueChange={setRole}
              options={[{ value: "any", label: t.prepare.any }, ...ROLES.map((x) => ({ value: x, label: t.role[x] })), { value: "none", label: t.prepare.noRole }]}
            />
            <Select label={t.prepare.filterRarity} value={rarity} onValueChange={setRarity} options={[{ value: "any", label: t.prepare.any }, ...RARITIES.map((x) => ({ value: x, label: tc.common.rarity[x] }))]} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ui-text-2">{t.prepare.cardsLabel}</p>
          {shown.length === 0 && <p className="text-sm text-ui-text-3">{t.prepare.noMatches}</p>}
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5" data-testid="pick-cards">
            {shown.map((c) => {
              const picked = team.some((x) => keyOf(x) === keyOf(c));
              const away = c.busyUntil && new Date(c.busyUntil).getTime() > serverMs;
              return (
                <li key={keyOf(c)}>
                  <button
                    type="button"
                    aria-pressed={picked}
                    disabled={Boolean(away) || (!picked && team.length >= TEAM_MAX)}
                    onClick={() => toggle(c)}
                    className={cx("xpick", picked && "xpick--on", `xpick--${c.rarity}`)}
                    data-testid="pick-card"
                    data-card={c.name}
                    data-holo={c.holo ? "1" : "0"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado y privado */}
                    <img src={c.thumb} alt="" className={cx("xpick__img", c.holo && "holo-finish")} loading="lazy" />
                    <span className="xpick__body">
                      <span className="block truncate text-xs font-bold">{c.characterName ?? c.name}</span>
                      <span className="block truncate text-[10px] text-ui-text-3">
                        {away ? t.prepare.away(time(c.busyUntil!)) : [c.terrain ? t.terrain[c.terrain] : null, c.role ? t.role[c.role] : null, t.prepare.bond(c.bondLevel), c.holo ? t.prepare.holo : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {team.length >= TEAM_MAX && <p className="text-xs text-ui-text-3">{t.prepare.full}</p>}
        </div>

        {slotsFree <= 0 && <Alert tone="warning">{t.prepare.noSlot}</Alert>}
        {error && (
          <div data-testid="prepare-error">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}
        <Button
          width="full"
          loading={busy}
          disabled={team.length === 0 || slotsFree <= 0}
          onClick={() => void onSend({ zoneId: zone.id, durationMin: duration, cards: team.map((c) => ({ cardId: c.cardId, holo: c.holo })) })}
          data-testid="send"
        >
          {t.prepare.send(t.duration(duration))}
        </Button>
      </div>
    </Modal>
  );
}
