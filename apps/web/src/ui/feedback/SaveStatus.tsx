import { cx } from "../variants";

/** Spec 027, RF-4: el estado de lo que se edita. `no-storage`: la ventana funciona, pero sin borrador en el navegador. */
export type SaveState = "clean" | "dirty" | "saving" | "saved" | "conflict" | "no-storage";

const DOT: Record<SaveState, string> = {
  clean: "bg-ui-text-3",
  dirty: "bg-ui-warning",
  saving: "bg-ui-info",
  saved: "bg-ui-success",
  conflict: "bg-ui-danger",
  "no-storage": "bg-ui-text-3",
};

const TEXT: Record<SaveState, string> = {
  clean: "text-ui-text-3",
  dirty: "text-ui-warning-text",
  saving: "text-ui-info-text",
  saved: "text-ui-success-text",
  conflict: "text-ui-danger-text",
  "no-storage": "text-ui-text-3",
};

export interface SaveStatusProps {
  state: SaveState;
  /** El texto ya traducido («Cambios sin guardar», «Guardado a las 14:05»…). */
  label: string;
  /** Una segunda línea más tenue (p. ej. «Sin borrador en este navegador»). */
  detail?: string;
  className?: string;
}

/**
 * Spec 027, RF-4: estado siempre visible de la ventana de la carta: «Sin cambios», «Cambios sin guardar», «Guardando…»
 * o «Guardado a las HH:MM». Se anuncia a los lectores de pantalla cuando cambia (aria-live).
 */
export function SaveStatus({ state, label, detail, className }: SaveStatusProps) {
  return (
    <p role="status" aria-live="polite" data-testid="save-status" data-state={state} className={cx("ui-save-status flex items-center gap-2 text-sm", TEXT[state], className)}>
      <span aria-hidden className={cx("size-2 shrink-0 rounded-full", DOT[state], state === "saving" && "animate-pulse")} />
      <span className="font-medium">{label}</span>
      {detail && <span className="text-xs text-ui-text-3">{detail}</span>}
    </p>
  );
}
