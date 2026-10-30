import { cx } from "../variants";

export interface EmptyStateProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Spec 011, RF-5: qué falta y qué hacer, en lugar de un hueco vacío. */
export function EmptyState({ title, children, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cx("ui-empty flex flex-col items-center gap-3 rounded-l border border-dashed border-ui-line px-6 py-10 text-center", className)} data-testid="empty-state">
      {icon && <div className="text-ui-text-3">{icon}</div>}
      <p className="text-base font-semibold text-ui-text">{title}</p>
      {children && <div className="max-w-md text-sm text-ui-text-2">{children}</div>}
      {action}
    </div>
  );
}
