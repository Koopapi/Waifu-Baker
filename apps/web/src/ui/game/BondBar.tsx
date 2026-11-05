import { Progress } from "../content/Progress";
import { cx } from "../variants";

export interface BondBarProps {
  /** Nombre de la barra para lectores de pantalla («Vínculo con Aiko»). */
  label: string;
  /** «Nivel 3». */
  levelLabel: string;
  /** Título del nivel («Amiga»), si tiene. */
  title?: string | null;
  /** «160 / 300 puntos». */
  pointsLabel: string;
  /** Puntos dentro del tramo del nivel y tamaño del tramo (al máximo, lleno). */
  value: number;
  max: number;
  /** Lo que desbloquea el siguiente nivel. */
  hint?: React.ReactNode;
  className?: string;
}

/** Spec 029, RF-15: barra de vínculo de un personaje con su nivel, su título, sus puntos y lo siguiente. */
export function BondBar({ label, levelLabel, title, pointsLabel, value, max, hint, className }: BondBarProps) {
  return (
    <div className={cx("space-y-2 rounded-l border border-ui-line bg-ui-raised p-4", className)} data-testid="bond-bar">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold" data-testid="bond-level">
            {levelLabel}
          </span>
          {title && (
            <span className="text-sm font-semibold text-ui-accent-text" data-testid="bond-title">
              {title}
            </span>
          )}
        </p>
        <span className="text-sm tabular-nums text-ui-text-2" data-testid="bond-points">
          {pointsLabel}
        </span>
      </div>
      <Progress label={label} value={value} max={max} />
      {hint && <p className="text-xs text-ui-text-3">{hint}</p>}
    </div>
  );
}
