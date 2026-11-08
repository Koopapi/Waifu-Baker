import type { Msg } from "../../types";

// Errores que solo se traducen en el servidor (rutas y acciones del panel de capas, spec 017): no van en el
// diccionario general, que viaja a todas las páginas del coleccionista. Los suma `getDict()`.
export const panelErrors: Record<string, Msg> = {
  // Spec 030: diseño del sobre (RF-12: dice qué campo falla).
  invalid_pack_design: (p) => `The pack design is not valid${p.path ? ` (${p.path})` : ""}. It was not saved.`,
  pack_upload_missing: (p) => `An image of the design didn't arrive${p.path ? ` (${p.path})` : ""}: add it again and save.`,
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
  free_adult: "An 18+ set can't be free.",
  // Spec 028: settings for new cards, new sets and the home page.
  invalid_card_defaults: (p) => `The text seal size goes from ${p.sealMin} to ${p.sealMax} and the border from ${p.borderMin} to ${p.borderMax}.`,
  invalid_odds_defaults: (p) => {
    if (p.reason === "range") return "Each chance goes from 0 to 100.";
    const where = `${p.kind === "gold" ? "Gold" : "Silver"} pack, ${({ base: "normal slots", boosted: "boosted slot", guaranteed: "last slot" } as Record<string, string>)[String(p.row)] ?? String(p.row)}`;
    if (p.reason === "slot_sum") return `${where}: adds up to ${p.sum}% instead of 100%. Nothing was saved.`;
    if (p.reason === "guarantee_slot") return `${where}: it can only give ${p.kind === "gold" ? "Epic" : "Rare"} or better. Nothing was saved.`;
    return `${where}: chances can't be negative. Nothing was saved.`;
  },
  invalid_bond_settings: "Points and dust go from 0 to 100,000, the holo factor from 1 to 5, crafting costs from 1 to 1,000,000 and each title up to 30 characters.",
  invalid_pity_defaults: (p) => `Each guarantee is a whole number of packs from ${p.min} to ${p.max} (0 turns it off).`,
  invalid_cover_cards: (p) =>
    p.reason === "duplicate"
      ? "Each home page card can only be chosen once."
      : p.reason === "invalid"
        ? "Only cards from published sets that aren't 18+ can be on the home page."
        : `Choose ${p.min} to ${p.max} cards for the home page (or none).`,
};
