import { cx } from "../variants";

/** Spec 011, RF-9: franja fija sobre la estructura (modo demo, avisos de mantenimiento…), de 34 px. */
export function Banner({ icon, children, action, className, ...rest }: { icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("flex h-[34px] items-center justify-center gap-3 overflow-hidden bg-ui-accent px-3 text-[13px] font-medium text-ui-on-accent", className)} {...rest}>
      {icon}
      {children}
      {action}
    </div>
  );
}
