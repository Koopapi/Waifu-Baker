import { forwardRef } from "react";
import { cx } from "../variants";

export interface PreviewStageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Texto bajo la carta (p. ej. «Pasa el cursor por aquí o arrastra la carta»). */
  hint?: React.ReactNode;
}

/**
 * Spec 025, RF-21: escena oscura de la vista previa de una carta, con rayos y trama de puntos (la del configurador de
 * Bruno). Reenvía la referencia y los eventos: el editor escucha aquí el ratón y el teclado.
 */
export const PreviewStage = forwardRef<HTMLDivElement, PreviewStageProps>(function PreviewStage({ hint, className, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={cx(
        "relative isolate grid touch-none place-items-center overflow-hidden rounded-l border-2 border-ui-line bg-ui-rail px-10 pb-12 pt-14",
        "before:absolute before:inset-0 before:-z-10 before:bg-[repeating-conic-gradient(from_0deg_at_50%_42%,color-mix(in_srgb,var(--ui-k-lavanda)_14%,transparent)_0deg_7deg,transparent_7deg_18deg)]",
        "after:absolute after:-bottom-10 after:-left-10 after:-z-10 after:size-56 after:rounded-full after:bg-[radial-gradient(color-mix(in_srgb,var(--ui-k-oro)_55%,transparent)_1.6px,transparent_2px)] after:bg-[length:14px_14px] after:[mask-image:radial-gradient(circle,#000_45%,transparent_72%)]",
        className,
      )}
      {...rest}
    >
      {children}
      {hint && <p className="absolute inset-x-4 bottom-3 text-center text-xs font-semibold italic text-ui-text-2">{hint}</p>}
    </div>
  );
});
