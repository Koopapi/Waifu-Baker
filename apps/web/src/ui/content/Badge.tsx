import { cx, variants } from "../variants";

const badgeClasses = variants({
  base: "inline-flex items-center gap-1 rounded-s px-2 py-0.5 text-xs font-semibold",
  variants: {
    tone: {
      neutral: "bg-ui-hover text-ui-text-2",
      accent: "bg-ui-accent/20 text-ui-accent-text",
      success: "bg-ui-success/20 text-ui-success-text",
      warning: "bg-ui-warning/25 text-ui-warning-text",
      danger: "bg-ui-danger/20 text-ui-danger-text",
      info: "bg-ui-info/20 text-ui-info-text",
    },
  },
  defaults: { tone: "neutral" },
});

export interface BadgeProps {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  /** Contador redondo (avisos sin leer, sobres sin abrir): 99+ a partir de 100. */
  count?: number;
  children?: React.ReactNode;
  className?: string;
}

/** Spec 011, RF-7: etiqueta de estado o contador. */
export function Badge({ tone, count, children, className }: BadgeProps) {
  if (count !== undefined) {
    return (
      <span className={cx("grid min-w-[18px] place-items-center rounded-full bg-ui-danger px-1.5 text-[11px] font-bold leading-[18px] text-ui-on-accent", className)}>
        {count > 99 ? "99+" : count}
      </span>
    );
  }
  return <span className={badgeClasses({ tone, className })}>{children}</span>;
}
