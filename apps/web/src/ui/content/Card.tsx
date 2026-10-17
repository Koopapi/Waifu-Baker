import { cx } from "../variants";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  /** Texto o acciones a la derecha del título. */
  aside?: React.ReactNode;
  /** Se eleva al pasar el ratón (tarjetas que llevan a otra página). */
  interactive?: boolean;
  as?: "section" | "div" | "li" | "article";
}

/** Spec 011, RF-7: superficie para agrupar contenido. */
export function Card({ title, aside, interactive, as: As = "section", className, children, ...rest }: CardProps) {
  return (
    <As
      className={cx(
        // Spec 014, RF-2: superficie con degradado sutil, borde luminoso y sombra.
        "rounded-xl border border-k-lavanda/15 bg-ui-nav bg-linear-to-b from-ui-raised to-ui-nav p-5 shadow-[var(--shadow-glow)]",
        interactive && "transition-[border-color,transform] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-k-lavanda/40",
        className,
      )}
      {...rest}
    >
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-ui-text">{title}</h2>}
          {aside && <div className="text-sm text-ui-text-2">{aside}</div>}
        </div>
      )}
      {children}
    </As>
  );
}
