import { loadSentry } from "./lib/sentry-client";

// Spec 007, RF-9 y RF-10: errores del navegador, solo con DSN público configurado. Spec 013, RF-11: el SDK se
// descarga cuando la página ya está cargada y el navegador está libre, fuera de la primera carga.
if (typeof window !== "undefined") {
  const start = () => ("requestIdleCallback" in window ? window.requestIdleCallback(() => void loadSentry()) : setTimeout(() => void loadSentry(), 1));
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
