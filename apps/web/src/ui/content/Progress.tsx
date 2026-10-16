import { cx } from "../variants";

export interface ProgressProps {
  label: string;
  value: number;
  max?: number;
  /** Muestra «12 / 26» a la derecha. */
  showValue?: boolean;
  className?: string;
}

/** Spec 011, RF-7: barra de progreso; el relleno se anima con transform (no con width). */
export function Progress({ label, value, max = 100, showValue, className }: ProgressProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="h-2 flex-1 overflow-hidden rounded-full bg-ui-hover">
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-ui-accent to-ui-accent-text transition-transform duration-[var(--duration-slow)] ease-out"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      {showValue && (
        <span className="text-sm tabular-nums text-ui-text-2">
          {value} / {max}
        </span>
      )}
    </div>
  );
}
