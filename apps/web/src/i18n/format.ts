import { INTL_TAG, type Locale } from "./locales";

/** RF-6: fechas según el idioma. */
export function formatDate(locale: Locale, d: Date | string, style: "long" | "medium" | "short" = "long") {
  return new Date(d).toLocaleDateString(INTL_TAG[locale], { dateStyle: style });
}

export function formatDateTime(locale: Locale, d: Date | string) {
  return new Date(d).toLocaleString(INTL_TAG[locale], { dateStyle: "medium", timeStyle: "short" });
}

/** RF-6: números según el idioma (1,234.5 frente a 1234,5). */
export function formatNumber(locale: Locale, n: number, maxFractionDigits = 2) {
  return n.toLocaleString(INTL_TAG[locale], { maximumFractionDigits: maxFractionDigits });
}

export function formatPercent(locale: Locale, pct: number, maxFractionDigits = 2) {
  return `${formatNumber(locale, pct, maxFractionDigits)} %`;
}

export function formatMoney(locale: Locale, cents: number, currency = "USD") {
  return (cents / 100).toLocaleString(INTL_TAG[locale], { style: "currency", currency });
}
