import { cx } from "../variants";

/** Spec 029, RF-4: resumen de lo que se gana (o cuesta) antes de confirmar: copias, puntos, polvo, nivel. */
export function GainSummary({ rows, className }: { rows: { label: string; value: string }[]; className?: string }) {
  return (
    <dl className={cx("grid grid-cols-2 gap-2 text-sm", className)} data-testid="gain-summary">
      {rows.map((r) => (
        <div key={r.label} className="rounded-m border border-ui-line p-2">
          <dt className="text-xs text-ui-text-3">{r.label}</dt>
          <dd className="font-semibold tabular-nums">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
