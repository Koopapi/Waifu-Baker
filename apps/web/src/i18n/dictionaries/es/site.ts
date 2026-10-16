import type { site as en } from "../en/site";

export const site: typeof en = {
  home: {
    tagline: "Cartas coleccionables de ilustración anime. Abre sobres, colecciona tus favoritas y completa cada colección.",
    aiNotice: "Ilustraciones generadas con IA. Las cartas son digitales, sin valor monetario y no intercambiables.",
  },
  login: {
    title: "Entrar",
    withPatreon: "Entrar con Patreon",
    patreonMissing: "Patreon aún no está configurado (faltan AUTH_PATREON_ID y AUTH_PATREON_SECRET).",
    devLogin: "Login de desarrollo",
    namePlaceholder: "Nombre",
    asAdmin: "Entrar como administrador",
    devSubmit: "Entrar (desarrollo)",
  },
  dropRates: {
    metaTitle: "Probabilidades",
    metaDescription: "Probabilidades publicadas de cada colección.",
    heading: "Probabilidades de los sobres",
    intro:
      "Cada sobre tiene varias ranuras. En cada ranura sale una carta, y la rareza se sortea con los porcentajes de su fila. Dentro de una rareza, todas las cartas tienen la misma probabilidad. Estas tablas se fijan al publicar la colección y no cambian después. Las cartas no tienen valor monetario ni se pueden intercambiar. Las ilustraciones de las cartas están generadas con IA.",
    empty: "Aún no hay colecciones publicadas.",
    published: (p) =>
      `Publicada el ${p.date} · versión ${p.version} · ${p.packSize} cartas por sobre · holo en Rara o superior: ${p.holo}`,
    pity: (n) =>
      `Protección de mala suerte: si abres ${n} sobres seguidos de esta colección sin ninguna carta Épica o superior, el siguiente trae al menos una (sustituye a la carta de la última ranura). El contador es tuyo y de esta colección.`,
    noPity: "Esta colección no tiene protección de mala suerte.",
    slot: "Ranura",
  },
  notFound: {
    title: "Página no encontrada",
    heading: "Esta página no existe",
    body: "Puede que el enlace haya cambiado o que el álbum ya no sea público.",
    home: "Volver al inicio",
  },
  error: {
    heading: "Algo ha fallado",
    body: "No es culpa tuya. Tus sobres y tus cartas están a salvo: inténtalo de nuevo en un momento.",
    code: (digest) => `Código: ${digest}`,
    home: "Ir al inicio",
  },
  lab: {
    metaTitle: "Laboratorio de apertura",
    metaDescription: "Prototipo local de la apertura de sobres con datos falsos.",
  },
  demo: {
    tag: "Demo local",
    roles: { collector: "coleccionista", admin: "administrador" },
    banner: (role) => `Modo demo · estás viendo la web como ${role === "admin" ? "administrador" : "coleccionista"}`,
    bannerShort: (role) => `Demo · ${role}`,
    switchTo: (role) => `Cambiar a ${role}`,
    enterCollector: "Entrar como coleccionista",
    enterCollectorDetail: "Sobres sin abrir, una colección empezada, galletas y una racha de 4 días.",
    enterAdmin: "Entrar como administrador",
    enterAdminDetail: "Colecciones, cartas, usuarios, métricas, copias y ajustes.",
    note: "Los datos de la demo se recrean cada vez que ejecutas pnpm demo. Nunca disponible en producción.",
    notSeeded: "La demo aún no tiene datos. Ejecuta pnpm demo para crearlos.",
  },
};
