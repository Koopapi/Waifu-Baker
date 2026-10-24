import type { Msg } from "../../types";

// Errores que solo se traducen en el servidor (rutas y acciones del panel de capas, spec 017): no van en el
// diccionario general, que viaja a todas las páginas del coleccionista. Los suma `getDict()`.
export const panelErrors: Record<string, Msg> = {
  no_layers: "This card has no layers to export yet.",
  character_required: "The girl can't be removed or hidden; you can replace her.",
  character_type: "Upload the girl as PNG or WebP (with transparency).",
  character_too_short: (p) => `The image is ${p.height} px tall; the minimum is ${p.min} px.`,
  two_characters: "A card can only have one girl (character layer).",
  card_not_assembled: (p) =>
    `Card ${String(p.number).padStart(3, "0")}: not assembled (missing ${String(p.missing)
      .split(",")
      .map((m) => (m === "personaje" ? "the girl" : "the background"))
      .join(" and ")}).`,
  duplicate_item: (p) => `This image is already in the library ("${p.name}").`,
  item_in_use: (p) => `${Number(p.count) === 1 ? "1 card uses" : `${p.count} cards use`} it (${p.sets}): change it there before removing it.`,
  invalid_item_name: "Give the item a name.",
  flatten_failed: "The card image couldn't be generated. Check its layers and try again.",
  no_pending_layers: "This card has no pending layer changes.",
};
