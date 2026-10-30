import { focusRing } from "../focus";
import { variants } from "../variants";

// Spec 014, RF-2: al pulsar, el botón se hunde en su relieve (rebote); con movimiento reducido no se mueve.
const interactive = `inline-flex items-center justify-center select-none font-extrabold transition-[color,background-color,border-color,transform,box-shadow] duration-[var(--duration-fast)] ease-out active:translate-y-[3px] active:scale-[0.97] active:shadow-none motion-reduce:active:translate-y-0 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50 ${focusRing}`;

/** RF-3: principal, secundario, peligro, éxito y discreto; tres tamaños. */
export const buttonClasses = variants({
  base: `ui-btn ${interactive} gap-2 rounded-full`,
  variants: {
    variant: {
      primary: "ui-btn-primary bg-ui-accent bg-linear-to-r from-k-chicle to-ui-accent-hover text-ui-on-accent shadow-[var(--shadow-relief)] hover:brightness-105",
      secondary: "ui-btn-secondary border border-k-lavanda/30 bg-ui-hover text-ui-text shadow-[var(--shadow-relief-soft)] hover:bg-ui-line",
      danger: "ui-btn-danger bg-ui-danger text-ui-on-accent shadow-[var(--shadow-relief-soft)] hover:brightness-110",
      success: "ui-btn-success bg-ui-success text-ui-on-accent shadow-[var(--shadow-relief-soft)] hover:brightness-110",
      ghost: "ui-btn-ghost text-ui-text-2 hover:bg-ui-hover hover:text-ui-text",
      patreon: "ui-btn-patreon bg-ui-patreon text-ui-rail hover:brightness-110",
      /** Sobre el color de acento (franjas): borde y texto claros. */
      onAccent: "ui-btn-on-accent border border-ui-on-accent text-ui-on-accent hover:bg-ui-text/15",
    },
    size: {
      xs: "h-6 whitespace-nowrap px-2.5 text-xs",
      sm: "h-8 whitespace-nowrap px-3 text-[13px]",
      md: "h-10 whitespace-nowrap px-4 text-sm",
      lg: "h-12 whitespace-nowrap px-5 text-base",
      /** Botón grande con contenido (icono, título y detalle), p. ej. los papeles de la demo. */
      block: "ui-btn-block min-h-16 gap-4 p-5 text-left text-base",
    },
    width: { auto: "", full: "w-full" },
  },
  defaults: { variant: "primary", size: "md", width: "auto" },
});

export const iconButtonClasses = variants({
  base: `ui-icon-btn ${interactive} shrink-0 rounded-full`,
  variants: {
    variant: {
      ghost: "text-ui-text-2 hover:bg-ui-hover hover:text-ui-text",
      secondary: "bg-ui-raised text-ui-text-2 hover:bg-ui-hover hover:text-ui-text",
    },
    size: { sm: "size-8", md: "size-9", lg: "size-11" },
  },
  defaults: { variant: "ghost", size: "md" },
});
