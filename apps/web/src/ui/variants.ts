// Spec 011, RF-1: variantes de componentes sin dependencias. Cada componente declara sus clases por variante
// (siempre con tokens) y recibe `className` solo para colocarse en la página, nunca para recolorearse.

type ClassValue = string | false | null | undefined | ClassValue[];

/** Une clases y descarta las vacías. */
export function cx(...values: ClassValue[]): string {
  const out: string[] = [];
  const add = (v: ClassValue) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(add);
    else out.push(v);
  };
  values.forEach(add);
  return out.join(" ");
}

type VariantMap = Record<string, Record<string, string>>;
type Choice<V extends VariantMap> = { [K in keyof V]?: keyof V[K] };

/** Crea la función de clases de un componente a partir de su base, sus variantes y sus valores por defecto. */
export function variants<V extends VariantMap>(config: { base: string; variants: V; defaults: { [K in keyof V]: keyof V[K] } }) {
  return (props: Choice<V> & { className?: string } = {}) =>
    cx(
      config.base,
      ...Object.keys(config.variants).map((k) => {
        const key = k as keyof V;
        const value = (props[key] ?? config.defaults[key]) as string;
        return config.variants[key][value];
      }),
      props.className,
    );
}

export type VariantProps<F> = F extends (props?: infer P) => string ? Omit<NonNullable<P>, "className"> : never;
