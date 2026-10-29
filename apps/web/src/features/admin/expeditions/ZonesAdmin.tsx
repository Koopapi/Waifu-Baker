"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveZoneAction, simulateZoneAction, type SimulationState } from "@/app/admin/expediciones/actions";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { DURATIONS, ROLES, TERRAINS, defaultZoneLoot, type DurationMin, type Role, type TeamMember, type Terrain, type ZoneLoot } from "@/domain/expeditions/rules";
import { FormMessage, SubmitButton } from "@/features/admin/ui";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber, formatPercent } from "@/i18n/format";
import { useGamesT } from "@/i18n/games";
import { Button } from "@/ui/action/Button";
import { Card } from "@/ui/content/Card";
import { Alert } from "@/ui/feedback/Alert";
import { useToast } from "@/ui/feedback/Toast";
import { Checkbox } from "@/ui/form/Choice";
import { Select } from "@/ui/form/Select";
import { TextField } from "@/ui/form/TextField";

export interface ZoneAdminDTO {
  id: string;
  name: string;
  terrain: Terrain;
  difficulty: number;
  fragmentsRequired: number;
  sortOrder: number;
  active: boolean;
  loot: ZoneLoot;
  image: string | null;
}

const pctInput = (x: number) => String(Math.round(x * 10_000) / 100);

/** RF-28 y RF-29: formulario de una zona (nueva o existente) con su botín por duración. */
function ZoneForm({ zone, nextOrder }: { zone?: ZoneAdminDTO; nextOrder: number }) {
  const t = useGamesT();
  const tc = useT();
  const [state, action] = useActionState(saveZoneAction, null);
  const form = useRef<HTMLFormElement>(null);
  const loot = zone?.loot ?? defaultZoneLoot(30);
  useEffect(() => {
    if (state?.ok && !zone) form.current?.reset();
  }, [state, zone]);
  return (
    <form ref={form} action={action} className="space-y-4" data-testid={zone ? "zone-form" : "new-zone-form"}>
      {zone && <input type="hidden" name="id" value={zone.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t.admin.name} name="name" required maxLength={40} defaultValue={zone?.name} />
        <Select label={t.admin.terrain} name="terrain" defaultValue={zone?.terrain ?? "city"} options={TERRAINS.map((x) => ({ value: x, label: t.terrain[x] }))} />
        <TextField label={t.admin.difficulty} name="difficulty" type="number" min={1} max={1000} required defaultValue={zone?.difficulty ?? 30} />
        <TextField label={t.admin.fragments} name="fragmentsRequired" type="number" min={0} max={999} required defaultValue={zone?.fragmentsRequired ?? 0} />
        <TextField label={t.admin.order} name="sortOrder" type="number" min={0} max={99} required defaultValue={zone?.sortOrder ?? nextOrder} />
        <div className="flex items-end pb-2">
          <Checkbox label={t.admin.activeLabel} name="active" defaultChecked={zone?.active ?? true} />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-ui-text-2">{t.admin.loot}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {DURATIONS.map((d) => (
            <div key={d} className="space-y-2 rounded-l border border-ui-line p-3">
              <TextField label={t.admin.lootCookies(t.duration(d))} name={`cookies_${d}`} type="number" min={0} max={10000} required defaultValue={loot[`${d}`].cookies} />
              <TextField label={t.admin.lootFragments(t.duration(d))} name={`fragments_${d}`} type="number" min={0} max={100} required defaultValue={loot[`${d}`].fragments} />
              <TextField label={t.admin.lootPack(t.duration(d))} name={`pack_${d}`} type="number" min={0} max={100} step="0.01" required defaultValue={pctInput(loot[`${d}`].packChance)} />
            </div>
          ))}
        </div>
        <p className="text-xs text-ui-text-3">{t.admin.lootHint}</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{zone ? tc.common.save : t.admin.create}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** RF-28: imagen de la zona en el mapa. */
function ZoneImage({ zone }: { zone: ZoneAdminDTO }) {
  const t = useGamesT();
  const toast = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("zoneId", zone.id);
      body.set("file", file);
      const res = await fetch("/api/admin/zone-image", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      toast(json.ok ? { kind: "success", title: t.admin.imageSaved } : { kind: "error", title: json.message ?? String(res.status) });
      if (json.ok) router.refresh();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {zone.image && (
        // eslint-disable-next-line @next/next/no-img-element -- imagen del panel servida por la API
        <img src={zone.image} alt="" className="h-20 w-32 rounded-m object-cover" />
      )}
      <Button variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
        {t.admin.uploadImage}
      </Button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} aria-label={t.admin.image} />
    </div>
  );
}

/** RF-30: simulador con un equipo hecho a mano. */
function Simulator({ zones }: { zones: ZoneAdminDTO[] }) {
  const t = useGamesT();
  const tc = useT();
  const locale = useLocale();
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [duration, setDuration] = useState<DurationMin>(120);
  const [team, setTeam] = useState<TeamMember[]>([{ rarity: "common", holo: false, terrain: null, role: null, bondLevel: 1 }]);
  const [state, setState] = useState<SimulationState | null>(null);
  const [busy, setBusy] = useState(false);
  const zone = zones.find((z) => z.id === zoneId);
  const patch = (i: number, p: Partial<TeamMember>) => setTeam((cur) => cur.map((m, k) => (k === i ? { ...m, ...p } : m)));
  const pct = (x: number) => formatPercent(locale, Math.round(x * 10_000) / 100);

  async function run() {
    setBusy(true);
    try {
      setState(await simulateZoneAction(zoneId, team, duration));
    } finally {
      setBusy(false);
    }
  }

  const r = state?.ok ? state.result : null;
  return (
    <Card className="space-y-4" data-testid="simulator">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold">{t.admin.simulator}</h2>
        <p className="text-sm text-ui-text-3">{t.admin.simulatorHint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label={t.admin.simZone} value={zoneId} onValueChange={setZoneId} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        <Select label={t.admin.simDuration} value={String(duration)} onValueChange={(v) => setDuration(Number(v) as DurationMin)} options={DURATIONS.map((d) => ({ value: String(d), label: t.duration(d) }))} />
      </div>
      <ol className="space-y-3">
        {team.map((m, i) => (
          <li key={i} className="space-y-2 rounded-l border border-ui-line p-3" data-testid="sim-member">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t.admin.member(i + 1)}</span>
              {team.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => setTeam((cur) => cur.filter((_, k) => k !== i))}>
                  {t.admin.removeMember}
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Select label={t.admin.rarity} value={m.rarity} onValueChange={(v) => patch(i, { rarity: v as Rarity })} options={RARITIES.map((x) => ({ value: x, label: tc.common.rarity[x] }))} />
              <Select
                label={t.admin.terrain}
                value={m.terrain ?? ""}
                onValueChange={(v) => patch(i, { terrain: (v || null) as Terrain | null })}
                options={[{ value: "", label: t.admin.none }, ...TERRAINS.map((x) => ({ value: x, label: t.terrain[x] }))]}
              />
              <Select
                label={t.admin.characterRole}
                value={m.role ?? ""}
                onValueChange={(v) => patch(i, { role: (v || null) as Role | null })}
                options={[{ value: "", label: t.admin.none }, ...ROLES.map((x) => ({ value: x, label: t.role[x] }))]}
              />
              <TextField label={t.admin.bondLevel} type="number" min={1} max={10} value={m.bondLevel} onChange={(e) => patch(i, { bondLevel: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} />
              <div className="flex items-end pb-2">
                <Checkbox label={t.admin.holo} checked={m.holo} onCheckedChange={(on) => patch(i, { holo: on })} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {team.length < 3 && (
          <Button variant="secondary" size="sm" onClick={() => setTeam((cur) => [...cur, { rarity: "common", holo: false, terrain: null, role: null, bondLevel: 1 }])}>
            {t.admin.addMember}
          </Button>
        )}
        <Button size="sm" loading={busy} disabled={!zoneId} onClick={() => void run()} data-testid="simulate">
          {t.admin.simulate}
        </Button>
      </div>
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      {r && zone && (
        <div className="space-y-1 rounded-l border border-ui-success/40 bg-ui-success/10 p-3 text-sm" data-testid="simulation-result" data-rating={r.rating}>
          <p>{t.admin.result.power(r.power, zone.difficulty, t.rating[r.rating])}</p>
          <p>{t.admin.result.loot(r.loot.cookies, r.loot.fragments)}</p>
          <p>{t.admin.result.perDay(r.cookiesPerDay, r.fragmentsPerDay)}</p>
          <p>{t.admin.result.pack(pct(r.loot.packChance), formatNumber(locale, r.packsPerDay))}</p>
          <p>{t.admin.result.simulated(pct(r.simulatedPackRate), formatNumber(locale, r.runs, 0))}</p>
        </div>
      )}
    </Card>
  );
}

/** Spec 020, RF-28 a RF-30: la página de Expediciones del panel. */
export function ZonesAdmin({ zones }: { zones: ZoneAdminDTO[] }) {
  const t = useGamesT();
  const nextOrder = Math.min(99, zones.reduce((n, z) => Math.max(n, z.sortOrder), 0) + 1);
  return (
    <div className="space-y-6" data-testid="zones-admin">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t.admin.title}</h1>
        <p className="max-w-3xl text-sm text-ui-text-3">{t.admin.intro}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">{t.admin.zones}</h2>
          {zones.length === 0 && <p className="text-sm text-ui-text-3">{t.admin.empty}</p>}
          <ul className="space-y-2">
            {zones.map((z) => (
              <li key={z.id}>
                <details className="group rounded-l bg-ui-nav" data-testid="zone-row" data-zone={z.name}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="w-8 tabular-nums text-ui-text-3">{z.sortOrder}</span>
                    <span className="min-w-0 flex-1 font-semibold">{z.name}</span>
                    <span className="text-ui-text-2">{t.terrain[z.terrain]}</span>
                    <span className="tabular-nums text-ui-text-2">{t.prepare.difficulty(z.difficulty)}</span>
                    <span className="text-ui-text-2">{z.fragmentsRequired ? t.admin.fragmentsToOpen(z.fragmentsRequired) : t.admin.open}</span>
                    <span className={z.active ? "text-ui-success-text" : "text-ui-text-3"}>{z.active ? t.admin.active : t.admin.inactive}</span>
                  </summary>
                  <div className="space-y-4 border-t border-ui-line p-4">
                    <ZoneImage zone={z} />
                    <ZoneForm zone={z} nextOrder={nextOrder} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <Card className="space-y-3">
            <h2 className="font-display text-base font-semibold">{t.admin.newZone}</h2>
            <ZoneForm nextOrder={nextOrder} />
          </Card>
        </div>
        {zones.length > 0 && <Simulator zones={zones} />}
      </div>
    </div>
  );
}
