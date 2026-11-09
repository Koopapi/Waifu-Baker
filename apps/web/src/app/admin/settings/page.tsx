import { db } from "@/db/client";
import { MinAgeForm } from "@/features/admin/settings/MinAgeForm";
import { CardDefaultsForm } from "@/features/admin/settings/CardDefaultsForm";
import { OddsDefaultsForm } from "@/features/admin/settings/OddsDefaultsForm";
import { PityDefaultsForm } from "@/features/admin/settings/PityDefaultsForm";
import { CoverCardsForm } from "@/features/admin/settings/CoverCardsForm";
import { assetUrl } from "@/features/admin/cards/types";
import { adminDefaultsDictionaries } from "@/i18n/admin-defaults";
import { getDict, getLocale } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { Card } from "@/ui/content/Card";
import { Button } from "@/ui/action/Button";
import { Select } from "@/ui/form/Select";
import { z } from "zod";
import { BondSettingsForm } from "@/features/admin/settings/BondSettingsForm";
import { simulateBond, simulationOptions } from "@/server/services/bonds";
import { getBondSettings, getCardDefaults, getCoverCards, getMinAge, getOddsDefaults, getPityDefaults, listCoverCandidates } from "@/server/services/settings";

export async function generateMetadata() {
  return { title: (await getDict()).admin.settings.title };
}

/** Spec 010, RF-17: ajustes de la web. Spec 028, RF-15 a RF-17 y RF-20: valores por defecto y cartas de portada. */
export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ sim?: string }> }) {
  await requireAdmin("/admin/settings");
  const { sim } = await searchParams;
  const [simSet, simCharacter] = (sim ?? "").split(":");
  const simValid = z.string().uuid().safeParse(simSet).success && z.string().uuid().safeParse(simCharacter).success;
  const [t, locale, minAge, cardDefaults, odds, pity, cover, candidates, bond, simOptions, simResult] = await Promise.all([
    getDict(),
    getLocale(),
    getMinAge(db),
    getCardDefaults(db),
    getOddsDefaults(db),
    getPityDefaults(db),
    getCoverCards(db),
    listCoverCandidates(db),
    getBondSettings(db),
    simulationOptions(db),
    simValid ? simulateBond(db, simSet, simCharacter) : Promise.resolve(null),
  ]);
  const s = t.admin.settings;
  const d = adminDefaultsDictionaries[locale];
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">{s.title}</h1>
      <Card className="max-w-2xl space-y-3" title={s.minAge.heading}>
        <p className="text-sm text-ui-text-2">{s.minAge.help}</p>
        <p className="text-sm font-medium" data-testid="min-age-current">
          {s.minAge.current(minAge)}
        </p>
        <MinAgeForm current={minAge} />
      </Card>
      <Card className="max-w-2xl space-y-3" title={d.cards.heading} data-testid="settings-card-defaults">
        <p className="text-sm text-ui-text-2">{d.cards.help}</p>
        <CardDefaultsForm current={cardDefaults} />
      </Card>
      <Card className="space-y-3" title={d.odds.heading} data-testid="settings-odds-defaults">
        <p className="text-sm text-ui-text-2">{d.odds.help}</p>
        <OddsDefaultsForm current={odds} />
      </Card>
      <Card className="max-w-2xl space-y-3" title={d.pity.heading} data-testid="settings-pity-defaults">
        <p className="text-sm text-ui-text-2">{d.pity.help}</p>
        <PityDefaultsForm current={pity} />
      </Card>
      <Card className="max-w-2xl space-y-3" title={d.cover.heading} data-testid="settings-cover-cards" id="cover-cards">
        <p className="text-sm text-ui-text-2">{d.cover.help}</p>
        <CoverCardsForm current={cover} candidates={candidates.map(({ keyThumb, ...c }) => ({ ...c, thumbUrl: assetUrl(keyThumb) }))} />
      </Card>
      {/* Spec 029, RF-22 y RF-23: vínculo y reciclaje, con el simulador. */}
      <Card className="space-y-4" title={d.bond.heading} data-testid="settings-bond">
        <p className="text-sm text-ui-text-2">{d.bond.help}</p>
        <BondSettingsForm current={bond} />
        <div className="space-y-2 border-t border-ui-line pt-4" data-testid="bond-sim">
          <h3 className="text-sm font-semibold">{d.bond.simHeading}</h3>
          <p className="text-xs text-ui-text-3">{d.bond.simHelp}</p>
          {simOptions.length === 0 ? (
            <p className="text-sm text-ui-text-3">{d.bond.simNone}</p>
          ) : (
            <form method="get" className="flex flex-wrap items-end gap-3">
              <Select
                label={d.bond.simPick}
                name="sim"
                defaultValue={sim && simOptions.some((o) => `${o.setId}:${o.characterId}` === sim) ? sim : `${simOptions[0].setId}:${simOptions[0].characterId}`}
                options={simOptions.map((o) => ({ value: `${o.setId}:${o.characterId}`, label: `${o.setCode} · ${o.characterName}` }))}
                className="min-w-64"
              />
              <Button type="submit" variant="secondary" data-testid="bond-sim-run">
                {d.bond.simRun}
              </Button>
            </form>
          )}
          {simResult && (
            <p className="text-sm font-semibold" data-testid="bond-sim-result">
              {d.bond.simResult(d.bond.days(simResult.free), d.bond.days(simResult.patron))}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
