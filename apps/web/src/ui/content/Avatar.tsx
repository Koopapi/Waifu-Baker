import { cx } from "../variants";

/** Iniciales de un nombre: «Demo Collector» → «DC». */
export function initialsOf(name: string) {
  const [a = "?", b] = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return (b ? a.slice(0, 1) + b.slice(0, 1) : a.slice(0, 2)).toUpperCase();
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  /** Punto de estado (en línea). */
  online?: boolean;
  className?: string;
}

const SIZE = { sm: "size-6 text-[10px]", md: "size-9 text-sm", lg: "size-12 text-base" };

/** Spec 011, RF-7: imagen del usuario o sus iniciales. */
export function Avatar({ name, src, size = "md", online, className }: AvatarProps) {
  return (
    <span className={cx("relative inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-ui-warning-text to-ui-accent font-bold text-ui-rail", SIZE[size], className)} aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatares de Patreon, ya pequeños
        <img src={src} alt="" className="size-full rounded-full object-cover" />
      ) : (
        initialsOf(name)
      )}
      {online && <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-[3px] border-ui-rail bg-ui-success" />}
    </span>
  );
}
