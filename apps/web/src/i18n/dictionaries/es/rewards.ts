import type { rewards as en } from "../en/rewards";

export const rewards: typeof en = {
  free: {
    title: "Sobre gratis",
    ready: (n, max) => `${n} de ${max} listos`,
    full: "Al máximo: reclama uno para que empiece a cargarse el siguiente.",
    nextIn: "El siguiente en",
    nextShort: "para el siguiente",
    chooseSet: "Colección",
    claim: "Reclamar sobre gratis",
    claimed: "Sobre gratis añadido a tus sobres.",
    none: "Ahora mismo no hay colecciones disponibles.",
  },
  daily: {
    title: "Recompensa diaria",
    day: (n) => `Día ${n}`,
    cookies: (n) => `${n} galletas`,
    pack: "1 sobre",
    claim: "Reclamar la recompensa de hoy",
    claimed: "Ya la reclamaste hoy. Vuelve mañana.",
    gotCookies: (n) => `¡+${n} galletas!`,
    gotPack: "¡Sobre añadido a tus sobres!",
    graceHint: "Puedes fallar un día sin perder la racha.",
    chooseSetForPack: "Colección del sobre del día 7",
  },
  cookies: {
    title: "Galletas",
    balance: (n) => `${n} galletas`,
    about: "Las galletas se ganan con la racha diaria. Pronto podrás gastarlas en juegos y sobres. No tienen valor monetario y no se pueden comprar, vender ni transferir.",
    history: "Historial",
    empty: "Todavía no tienes galletas.",
    reason: (r) => (r.startsWith("daily:") ? `Recompensa diaria · día ${r.slice(6)}` : r.startsWith("admin:") ? `Ajuste · ${r.slice(6).trim()}` : r),
  },
  countdown: (h, m, s) => `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`,
};
