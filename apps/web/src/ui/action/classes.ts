import { focusRing } from "../focus";
import { variants } from "../variants";

const interactive = `inline-flex items-center justify-center select-none font-semibold transition-[color,background-color,border-color,transform] duration-[var(--duration-fast)] ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${focusRing}`;

/** RF-3: principal, secundario, peligro, éxito y discreto; tres tamaños. */
export const buttonClasses = variants({
  base: `${interactive} gap-2 rounded-m`,
  variants: {
    variant: {
      primary: "bg-ui-accent text-ui-on-accent hover:bg-ui-accent-hover",
      secondary: "bg-ui-raised text-ui-text hover:bg-ui-hover",
      danger: "bg-ui-danger text-ui-on-accent hover:brightness-110",
      success: "bg-ui-success text-ui-on-accent hover:brightness-110",
      ghost: "text-ui-text-2 hover:bg-ui-hover hover:text-ui-text",
      patreon: "bg-ui-patreon text-ui-rail hover:brightness-110",
      /** Sobre el color de acento (franjas): borde y texto claros. */
      onAccent: "border border-ui-on-accent text-ui-on-accent hover:bg-ui-text/15",
    },
    size: {
      xs: "h-6 whitespace-nowrap px-2.5 text-xs",
      sm: "h-8 whitespace-nowrap px-3 text-[13px]",
      md: "h-10 whitespace-nowrap px-4 text-sm",
      lg: "h-12 whitespace-nowrap px-5 text-base",
      /** Botón grande con contenido (icono, título y detalle), p. ej. los papeles de la demo. */
      block: "min-h-16 gap-4 p-5 text-left text-base",
    },
    width: { auto: "", full: "w-full" },
  },
  defaults: { variant: "primary", size: "md", width: "auto" },
});

export const iconButtonClasses = variants({
  base: `${interactive} shrink-0 rounded-m`,
  variants: {
    variant: {
      ghost: "text-ui-text-2 hover:bg-ui-hover hover:text-ui-text",
      secondary: "bg-ui-raised text-ui-text-2 hover:bg-ui-hover hover:text-ui-text",
    },
    size: { sm: "size-8", md: "size-9", lg: "size-11" },
  },
  defaults: { variant: "ghost", size: "md" },
});
