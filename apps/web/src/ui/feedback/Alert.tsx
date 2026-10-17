import { CircleAlert, CircleCheck, Info, TriangleAlert } from "@/ui/icons/glyphs";
import { cx, variants } from "../variants";

const alertClasses = variants({
  base: "flex gap-3 rounded-l border p-4 text-sm",
  variants: {
    tone: {
      info: "border-ui-info/40 bg-ui-info/10",
      success: "border-ui-success/50 bg-ui-success/10",
      warning: "border-ui-warning/60 bg-ui-warning/10",
      danger: "border-ui-danger/50 bg-ui-danger/10",
    },
  },
  defaults: { tone: "info" },
});

const ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert };
const TEXT = { info: "text-ui-info-text", success: "text-ui-success-text", warning: "text-ui-warning-text", danger: "text-ui-danger-text" };

export interface AlertProps {
  tone?: keyof typeof ICON;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Acciones a la derecha (botones o enlaces). */
  actions?: React.ReactNode;
  className?: string;
}

/** Spec 011, RF-5: mensaje en línea; los errores se anuncian al momento (role=alert). */
export function Alert({ tone = "info", title, children, actions, className }: AlertProps) {
  const Icon = ICON[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={alertClasses({ tone, className })} data-tone={tone}>
      <Icon aria-hidden className={cx("mt-0.5 size-[18px] shrink-0", TEXT[tone])} />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className={cx("font-semibold", TEXT[tone])}>{title}</p>}
        {children && <div className="text-ui-text-2">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-start gap-2">{actions}</div>}
    </div>
  );
}
