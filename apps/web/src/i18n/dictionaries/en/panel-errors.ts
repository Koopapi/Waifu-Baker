import type { Msg } from "../../types";

// Errores que solo se traducen en el servidor (rutas y acciones del panel de capas, spec 017): no van en el
// diccionario general, que viaja a todas las páginas del coleccionista. Los suma `getDict()`.
export const panelErrors: Record<string, Msg> = {
  no_layers: "This card has no layers to export yet.",
  character_required: "The girl can't be removed or hidden; you can replace her.",
  character_type: "Upload the girl as PNG or WebP (with transparency).",
  character_too_short: (p) => `The image is ${p.height} px tall; the minimum is ${p.min} px.`,
  duplicate_background: (p) => `This background is already in the library ("${p.name}").`,
  background_in_use: (p) => `${p.count} ${Number(p.count) === 1 ? "card uses" : "cards use"} this background: change it on them before removing it.`,
  two_characters: "A card can only have one girl (character layer).",
  card_not_assembled: (p) =>
    `Card ${String(p.number).padStart(3, "0")}: not assembled (missing ${String(p.missing)
      .split(",")
      .map((m) => (m === "personaje" ? "the girl" : "the background"))
      .join(" and ")}).`,
};
