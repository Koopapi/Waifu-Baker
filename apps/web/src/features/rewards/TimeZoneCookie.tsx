"use client";

import { useEffect } from "react";

/**
 * Spec 009, RF-10: guarda la zona horaria del navegador en una cookie desde la primera página que se
 * visite (también el login), para que el servidor sepa cuándo cambia el día sin tener que refrescar.
 */
export function TimeZoneCookie() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const current = document.cookie.match(/(?:^|;\s*)wb_tz=([^;]*)/)?.[1];
    if (current && decodeURIComponent(current) === tz) return;
    document.cookie = `wb_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
