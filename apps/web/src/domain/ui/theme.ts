// Spec 026: los temas de la interfaz. Kawaii (oscuro, spec 014) es el de siempre y el que ve quien no tiene sesión;
// Street pop (claro) es el diseño de Bruno que cada usuario puede elegir en «Mi cuenta».
export const THEMES = ["kawaii", "street"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "kawaii";

/** RF-2 y RF-3: cualquier valor que no sea un tema conocido (o ninguno) es el kawaii. */
export function parseTheme(value: unknown): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}
