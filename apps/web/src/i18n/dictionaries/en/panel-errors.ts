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
  // Spec 020: Expeditions (collector and panel).
  invalid_terrain: "That terrain doesn't exist.",
  invalid_role: "That role doesn't exist.",
  invalid_zone: (p) =>
    ({
      name: "The zone name is required and allows up to 40 characters.",
      terrain: "That terrain doesn't exist.",
      difficulty: "Difficulty goes from 1 to 1000.",
      fragments: "Fragments to unlock it go from 0 to 999.",
      order: "Order goes from 0 to 99.",
      loot: "Each duration's loot needs cookies (0 to 10,000), fragments (0 to 100) and a pack chance from 0 to 100%.",
    })[String(p.field)] ?? "The zone isn't valid.",
  invalid_team: "A team takes 1 to 3 different cards.",
  invalid_duration: "The duration must be 30 min, 2 h or 8 h.",
  zone_locked: "That zone is still covered in fog: unlock it with map fragments.",
  no_free_slot: (p) => `Your ${p.slots} slots are in use: claim or cancel an expedition.`,
  card_not_owned: "That card isn't in your collection.",
  card_busy: "That card is already on another expedition.",
  expedition_not_active: "That expedition is already over.",
  expedition_returned: "The team is back: claim their loot.",
  not_returned: "The team hasn't come back yet.",
  pack_not_pending: "That expedition has no pack to choose.",
  not_enough_fragments: (p) => `You need more map fragments: you have ${p.have} of ${p.need}.`,
};
