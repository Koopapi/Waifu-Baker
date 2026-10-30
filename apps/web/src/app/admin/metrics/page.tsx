import { db } from "@/db/client";
import { formatDateTime, formatNumber } from "@/i18n/format";
import { getDict, getLocale } from "@/i18n/server";
import { now } from "@/server/clock";
import { backupStatus } from "@/server/services/backups";
import { Card } from "@/ui/content/Card";
import { Alert } from "@/ui/feedback/Alert";
import { dailyMetrics } from "@/server/services/metrics";

export async function generateMetadata() {
  return { title: (await getDict()).admin.metrics.title };
}

const KEYS = ["newUsers", "activeUsers", "packsOpened", "freeClaims", "dailyClaims"] as const;

/** Spec 007: métricas de 30 días (RF-11, RF-12) y estado de las copias (RF-16, RF-17). */
export default async function MetricsPage() {
  const t = (await getDict()).admin.metrics;
  const locale = await getLocale();
  const [m, b] = await Promise.all([dailyMetrics(db, now()), backupStatus(db)]);
  const max = Math.max(1, ...m.days.map((d) => d.packsOpened));
  const mb = (n: number | null) => `${formatNumber(locale, (n ?? 0) / 1024 / 1024, 1)} MB`;
  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ui-text-2">{t.intro}</p>
      </div>

      <Card className="space-y-2" data-testid="backup-status" title={t.backups}>
        <p className="text-sm" data-testid="backup-last-ok">
          {b.lastOk ? t.lastOk(formatDateTime(locale, b.lastOk.finishedAt ?? b.lastOk.startedAt), mb(b.lastOk.bytes)) : t.noBackup}
        </p>
        {b.lastFailure && (
          <div data-testid="backup-last-failure">
            <Alert tone="danger">{t.lastFailure(formatDateTime(locale, b.lastFailure.startedAt), b.lastFailure.error ?? "")}</Alert>
          </div>
        )}
        <p className="text-xs text-ui-text-3">{t.howTo}</p>
      </Card>

      <section className="space-y-3" data-testid="metrics">
        <p className="text-sm text-ui-text-2" data-testid="active-albums">
          {t.activeAlbums(m.activeAlbums)}
        </p>
        <div className="overflow-x-auto rounded-l bg-ui-nav">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-ui-rail text-left text-xs uppercase tracking-wider text-ui-text-3">
              <tr>
                <th className="px-3 py-2">{t.th.day}</th>
                {KEYS.map((k) => (
                  <th key={k} className="px-3 py-2 text-right">
                    {t.th[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-ui-line font-semibold" data-testid="metrics-totals">
                <td className="px-3 py-2">{t.totals}</td>
                <td className="px-3 py-2 text-right tabular-nums">{m.totals.newUsers}</td>
                <td className="px-3 py-2 text-right text-ui-text-3">—</td>
                <td className="px-3 py-2 text-right tabular-nums">{m.totals.packsOpened}</td>
                <td className="px-3 py-2 text-right tabular-nums">{m.totals.freeClaims}</td>
                <td className="px-3 py-2 text-right tabular-nums">{m.totals.dailyClaims}</td>
              </tr>
              {m.days.map((d) => (
                <tr key={d.day} className="border-t border-ui-line" data-day={d.day}>
                  <td className="px-3 py-1.5 font-mono text-xs text-ui-text-2">{d.day}</td>
                  {KEYS.map((k) => (
                    <td key={k} className="px-3 py-1.5 text-right tabular-nums">
                      {k === "packsOpened" ? (
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="inline-block h-1.5 rounded bg-ui-accent/70" style={{ width: `${(d.packsOpened / max) * 60}px` }} />
                          {d[k]}
                        </span>
                      ) : (
                        d[k]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
