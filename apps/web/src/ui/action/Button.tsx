import { forwardRef } from "react";
import { Slot } from "radix-ui";
import { LoaderCircle } from "lucide-react";
import { cx, type VariantProps } from "../variants";
import { buttonClasses, iconButtonClasses } from "./classes";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonClasses> {
  /** Icono a la izquierda (o un indicador de carga mientras `loading`). */
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Muestra el indicador de carga y bloquea el botón. */
  loading?: boolean;
  /** Pinta el hijo (p. ej. un `<Link>`) con el aspecto de botón, sin anidar un `<button>`. */
  asChild?: boolean;
}

/** Spec 011, RF-3: el botón de toda la web. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, width, icon, iconRight, loading = false, asChild = false, className, children, disabled, ...rest },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  const lead = loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon;
  return (
    <Comp
      ref={ref}
      className={buttonClasses({ variant, size, width, className })}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          {lead}
          {children}
          {iconRight}
        </>
      )}
    </Comp>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof iconButtonClasses> {
  /** Obligatorio: es el nombre que leen los lectores de pantalla y la descripción emergente. */
  label: string;
  children: React.ReactNode;
}

/** Spec 011, RF-3: botón solo con icono; siempre con nombre accesible. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, variant, size, className, children, ...rest }, ref) {
  return (
    <button ref={ref} type="button" aria-label={label} title={label} className={cx(iconButtonClasses({ variant, size }), className)} {...rest}>
      {children}
    </button>
  );
});
