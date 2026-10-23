import type { Msg } from "../../types";

// Errores que solo se traducen en el servidor (rutas y acciones del panel de capas, spec 017): no van en el
// diccionario general, que viaja a todas las páginas del coleccionista. Los suma `getDict()`.
export const panelErrors: Record<string, Msg> = {
  no_layers: "Esta carta todavía no tiene capas que exportar.",
  character_required: "La chica no se puede quitar ni ocultar; puedes sustituirla.",
  character_type: "La chica debe subirse en PNG o WebP (con transparencia).",
  character_too_short: (p) => `La imagen mide ${p.height} px de alto; el mínimo es ${p.min} px.`,
  two_characters: "Una carta solo puede tener una chica (capa de personaje).",
  card_not_assembled: (p) =>
    `Carta ${String(p.number).padStart(3, "0")}: no está armada (falta ${String(p.missing)
      .split(",")
      .map((m) => (m === "personaje" ? "la chica" : "el fondo"))
      .join(" y ")}).`,
  duplicate_item: (p) => `Esta imagen ya está en la biblioteca («${p.name}»).`,
  item_in_use: (p) => `Lo ${Number(p.count) === 1 ? "usa 1 carta" : `usan ${p.count} cartas`} (${p.sets}): cámbialo en ${Number(p.count) === 1 ? "ella" : "ellas"} antes de quitarlo.`,
  invalid_name: "Ponle un nombre al elemento.",
};
