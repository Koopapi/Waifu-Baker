import { db } from "@/db/client";
import { MinAgeForm } from "@/features/admin/settings/MinAgeForm";
import { getDict } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { Card } from "@/ui/content/Card";
import { getMinAge } from "@/server/services/settings";

export async function generateMetadata() {
  return { title: (await getDict()).admin.settings.title };
}

/** Spec 010, RF-17: ajustes de la web. */
export default async function AjustesPage() {
  await requireAdmin("/admin/settings");
  const [t, minAge] = await Promise.all([getDict(), getMinAge(db)]);
  const s = t.admin.settings;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{s.title}</h1>
      <Card className="space-y-3" title={s.minAge.heading}>
        <p className="text-sm text-ui-text-2">{s.minAge.help}</p>
        <p className="text-sm font-medium" data-testid="min-age-current">
          {s.minAge.current(minAge)}
        </p>
        <MinAgeForm current={minAge} />
      </Card>
    </div>
  );
}
