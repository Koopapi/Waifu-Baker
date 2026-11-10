"use client";

import { useEffect, useState } from "react";
import type { LayersConfig } from "@/domain/cards/layers";
import type { ChangedPart } from "@/domain/cards/versions";
import { useLocale } from "@/i18n/client";
import { useAdminLayersT } from "@/i18n/admin-layers";
import { Button } from "@/ui/action/Button";
import { Badge } from "@/ui/content/Badge";
import { finalCardConfig } from "@/domain/cards/final-card";
import { CartaCapas } from "@/ui/game/CartaCapas";
import { assetUrl } from "./types";

interface VersionRow {
  number: number;
  createdAt: string;
  actorName: string | null;
  changed: ChangedPart;
  pending: boolean;
  layers: LayersConfig | null;
}

/** La configuración de una versión con enlaces del panel, para la carta mini (como la vista previa del editor). */
/** Spec 034: la versión tal como se vería (la misma preparación que la carta final). */
function previewConfig(c: LayersConfig) {
  return { ...finalCardConfig(c, (k) => assetUrl(k) ?? ""), aparecer: false };
}

/**
 * Spec 027, RF-19 a RF-21: la lista plegable de versiones de la carta (fecha, hora, quién, qué cambió y una carta mini
 * viva en reposo) con «Volver a esta versión». Se carga al abrirse, para no retrasar la ventana; `refreshKey` la
 * vuelve a cargar tras cada guardado.
 */
export function VersionsPanel({ cardId, refreshKey, onRestore, disabled }: { cardId: string; refreshKey: number; onRestore: (n: number) => void; disabled?: boolean }) {
  const t = useAdminLayersT().guardado.versions;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/admin/cards/${cardId}/versions`)
      .then((r) => r.json())
      .then((data) => {
        if (alive && data.ok) setVersions(data.versions as VersionRow[]);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, cardId, refreshKey]);

  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="space-y-3" data-testid="card-versions">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ui-text-2">{t.title}</h3>
        <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="versions-toggle">
          {open ? t.hide : t.show}
        </Button>
      </div>
      {open && (
        <div className="space-y-2" data-testid="versions-list">
          {loading && !versions && <p className="text-sm text-ui-text-3">{t.loading}</p>}
          {versions && versions.length === 0 && <p className="text-sm text-ui-text-3">{t.empty}</p>}
          {versions?.map((v) => (
            <div key={v.number} className="flex flex-wrap items-center gap-3 rounded-m border border-ui-line p-2" data-testid="version-row" data-version={v.number}>
              {v.layers ? (
                <CartaCapas config={previewConfig(v.layers)} tier={v.layers.marco === "personalizado" || v.layers.marco === "ninguno" ? "n" : v.layers.marco} image="" label={t.preview(v.number)} estatica noSeal className="w-14 shrink-0" />
              ) : (
                <div aria-hidden className="aspect-[700/991] w-14 shrink-0 rounded-s bg-ui-hover" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-ui-text">
                  {t.version(v.number)} <span className="font-normal text-ui-text-3">· {when.format(new Date(v.createdAt))}</span>
                </p>
                <p className="text-ui-text-2">
                  {v.actorName ? t.by(v.actorName) : t.unknown} · {t.changed[v.changed]}
                  {v.pending && (
                    <>
                      {" "}
                      <Badge tone="info">{t.pending}</Badge>
                    </>
                  )}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onRestore(v.number)} disabled={disabled} data-testid="version-restore">
                {t.restore}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
