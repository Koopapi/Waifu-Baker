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
import { getCardDefaults, getCoverCards, getMinAge, getOddsDefaults, getPityDefaults, listCoverCandidates } from "@/server/services/settings";

export async function generateMetadata() {
  return { title: (await getDict()).admin.settings.title };
}

/** Spec 010, RF-17: ajustes de la web. Spec 028, RF-15 a RF-17 y RF-20: valores por defecto y cartas de portada. */
export default async function AjustesPage() {
  await requireAdmin("/admin/settings");
  const [t, locale, minAge, cardDefaults, odds, pity, cover, candidates] = await Promise.all([
    getDict(),
    getLocale(),
    getMinAge(db),
    getCardDefaults(db),
    getOddsDefaults(db),
    getPityDefaults(db),
    getCoverCards(db),
    listCoverCandidates(db),
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
      <Card className="max-w-2xl space-y-3" title={d.cover.heading} data-testid="settings-cover-cards">
        <p className="text-sm text-ui-text-2">{d.cover.help}</p>
        <CoverCardsForm current={cover} candidates={candidates.map(({ keyThumb, ...c }) => ({ ...c, thumbUrl: assetUrl(keyThumb) }))} />
      </Card>
    </div>
  );
}
