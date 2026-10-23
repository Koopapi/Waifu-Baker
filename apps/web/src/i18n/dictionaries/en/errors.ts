import type { Msg, MsgParams } from "../../types";
import { common } from "./common";

// Mensajes de error y de validación por código (servicios y dominio). Spec 008, RF-5 y RF-10.
// Las funciones reciben los `params` del error; ver `src/i18n/errors.ts`.

const pad = (n: string | number | undefined) => String(n ?? "").padStart(3, "0");
const rarity = (r: string | number | undefined) => common.rarity[r as keyof typeof common.rarity] ?? String(r ?? "");
const FIELD: Record<string, string> = { character: "character", name: "name", rarity: "rarity", image: "composed image" };
const plural = (n: string | number | undefined, one: string, many: string) => (Number(n) === 1 ? one : many);

/** Traduce otro código del mismo diccionario (para mensajes que agrupan varios problemas). */
function msg(code: string, params: MsgParams = {}): string {
  const m = errors[code];
  if (typeof m === "function") return m(params);
  return m ?? "";
}

/** `invalid_odds` con `problems` (JSON de { code, params }) une los problemas traducidos. */
function oddsProblems(raw: string | number): string {
  try {
    const list = JSON.parse(String(raw)) as { code: string; params?: MsgParams }[];
    return list.map((p) => msg(p.code, p.params)).join(" ");
  } catch {
    return "The drop rates are not valid.";
  }
}

export const errors: Record<string, Msg> = {
  unknown: "Something went wrong. Please try again.",
  welcome_not_allowed: "Only a published SFW set can be the welcome set.",
  choose_set: "Choose a set.",
  set_not_claimable: "That set is not available for free packs. Choose another one.",
  invalid_min_age: "The minimum age can only be 16 or 18.",
  album_hidden: "Your album is hidden: change the alias and request a review.",
  invalid_moderation_reason: "Choose a reason from the list.",
  note_too_long: (p: MsgParams) => `The note can be at most ${p.max} characters long.`,
  album_already_hidden: "That album is already hidden.",
  not_hidden: "Your album is not hidden.",
  same_alias: "Write an alias different from the current one.",
  review_pending: "A review is already pending.",
  review_too_soon: (p: MsgParams) => `You requested a review recently. You can request another one from ${new Date(String(p.until)).toLocaleDateString("en", { day: "numeric", month: "long" })}.`,
  review_already_decided: "That review has already been decided.",
  card_not_in_set: "That card is not in this set.",
  no_free_charges: "You don't have free packs yet: wait for the next one to charge.",
  already_claimed_today: "You already claimed today's reward. Come back tomorrow.",
  tz_change_too_soon: "You changed time zone recently: you can claim once 20 hours have passed since your last reward.",
  invalid_cookie_amount: (p) => `The amount must be a whole number other than zero (up to ${p.max ?? 100000}).`,
  insufficient_cookies: "The balance cannot go below zero.",
  adult_tier_required: "To see 18+ content you need an active adult tier on Patreon.",
  patreon_unavailable: "Patreon is not configured or did not respond. Please try again later.",

  // Genéricos con varios significados: un parámetro distingue cada caso.
  not_found: (p) =>
    ({
      user: "This user doesn't exist.",
      set: "This set doesn't exist.",
      tier_rule: "This rule doesn't exist.",
      drop_table: "This set has no drop rate table.",
      character: "This character doesn't exist.",
      chosen_character: "The selected character no longer exists.",
      pack: "That pack doesn't exist.",
      card: "This card doesn't exist.",
      selected_cards: "Some of the selected cards no longer exist.",
    })[String(p.entity)] ?? "Not found.",
  stale_version: (p) => {
    if (p.entity === "set") {
      return p.variant === "short"
        ? "The set has changed since you opened it. Reload the page."
        : "The set has changed since you opened it. Reload the page to see the changes.";
    }
    if (p.entity === "card") return "The card has changed since you opened it. Reload to see the current version.";
    if (p.entity === "selected_cards") return "Some cards have changed since you loaded the page. Reload and try again.";
    return "The data has changed since you opened it. Reload the page.";
  },
  locked: (p) =>
    ({
      set: "This set is already published: you can only change its name.",
      odds: "The drop rates of a published set can't be changed.",
      odds_version: "This drop rate version is already published.",
      cards: "This set is already published: cards, rarities, variants and numbers can't be added, removed or changed.",
    })[String(p.what)] ?? "This set is already published.",
  invalid_name: (p) => {
    if (p.reason === "no_alnum") return "The name must contain letters or numbers.";
    if (p.entity === "card") return `Card names can be up to ${p.max} characters long.`;
    return `The name is required and can be up to ${p.max ?? 80} characters long.`;
  },
  invalid_transition: (p) =>
    p.action === "archive" ? "Only a published set can be archived." : "Only a draft set can be published.",
  not_grantable: (p) =>
    p.context === "tier"
      ? `${p.set} is not published: only published sets can be assigned to a tier.`
      : `${p.set} is not published: packs from it can't be gifted.`,
  age_not_verified: (p) =>
    p.context === "gift"
      ? "This user hasn't passed age verification: they can't receive 18+ packs."
      : "This pack is from an 18+ set: verify your age to open it.",
  missing_original: (p) => (p.what === "pending" ? "The pending art couldn't be found." : "The card's original image couldn't be found."),
  duplicate_image: (p) =>
    p.number === undefined ? "This image is already in the set." : `This image is already in the set (card ${pad(p.number)}).`,
  no_cards: (p) => (p.context === "simulate" ? "Give at least one card a rarity to simulate a pack." : "The set has no cards."),
  invalid_odds: (p) =>
    p.problems !== undefined
      ? oddsProblems(p.problems)
      : "Pity must be a whole number of packs between 0 and 100 (0 turns it off).",

  // Servicios del panel.
  invalid_reason: (p) => `Write a reason between ${p.min ?? 3} and ${p.max ?? 200} characters long.`,
  invalid_count: (p) => `You can gift ${p.min ?? 1} to ${p.max ?? 20} packs at a time.`,
  user_deleted: "This user's account has been deleted.",
  invalid_packs: (p) => `Packs per month must be a whole number between ${p.min ?? 1} and ${p.max ?? 50}.`,
  invalid_tier: "The Patreon tier is missing.",
  invalid_code: (p) => `The code must be ${p.min ?? 2} to ${p.max ?? 8} letters or numbers, without spaces (for example WB01).`,
  invalid_pack_size: (p) => `A pack must have between ${p.min ?? 1} and ${p.max ?? 10} cards.`,
  duplicate_code: (p) => `A set with the code ${p.code} already exists.`,
  duplicate_slug: (p) => `A character with the identifier "${p.slug}" already exists.`,
  character_in_use: (p) =>
    `This character has ${p.count} ${plural(p.count, "card", "cards")}. Reassign ${plural(p.count, "it", "them")} before deleting the character.`,
  invalid_order: "The submitted order doesn't match the current cards. Reload the page.",
  not_adult: "Only cards from 18+ sets need review.",

  // Sobres y álbum del coleccionista.
  geo_blocked:
    "In Belgium, packs with random contents are legally treated as gambling, so they can't be opened from there. Your packs are kept.",
  not_published: "This set doesn't have published drop rates yet.",
  no_album: "Turn on your public album first.",
  invalid_alias: (p) => msg("alias_length", p),
  alias_length: (p) => `Your alias must be between ${p.min ?? 2} and ${p.max ?? 30} characters long.`,
  invalid_featured: (p) => msg(String(p.reason ?? "featured_not_owned"), p),
  featured_too_many: (p) => `You can feature up to ${p.max ?? 5} cards.`,
  featured_duplicate: "You picked the same card twice.",
  featured_not_owned: "You can only feature SFW cards you own.",

  // Subida de imágenes.
  unsupported_type: "Unsupported format: upload PNG, JPEG or WebP.",
  too_large: (p) => `The file is larger than ${p.maxMb ?? 20} MB: shrink it or export it as WebP.`,
  too_narrow: (p) => `The image is ${p.width} px wide; the minimum is ${p.min} px.`,
  unreadable: "The image couldn't be read: the file seems to be damaged.",

  // Spec 016: layered cards.
  layer_too_narrow: (p) => `The layer is ${p.width} px wide; the minimum is ${p.min} px.`,
  layer_ratio: (p) => `The layer is ${p.width} × ${p.height}; it must have the canvas ratio (${p.expected}).`,
  too_many_layers: (p) => `A card takes at most ${p.max ?? 8} image layers (particles don't count).`,
  no_visible_layer: "At least one visible image layer is needed.",
  invalid_layers: (p) => `The layer setup is not valid${p.path ? ` (${p.path})` : ""}.`,
  layer_missing: "One of the layers is no longer available: upload it again.",
  layers_required: "This card was created from layers and has no original image: it needs at least one visible image layer.",
  two_characters: "A card can only have one girl (character layer).",
  character_required: "The girl can't be removed or hidden; you can replace her.",

  // Probabilidades y comprobaciones antes de publicar.
  slot_count: (p) =>
    `The pack has ${p.packSize} ${plural(p.packSize, "card", "cards")} but there ${plural(p.slots, "is", "are")} ${p.slots} drop rate ${plural(p.slots, "slot", "slots")}.`,
  negative_weight: (p) => `Slot ${p.slot} has negative or invalid weights.`,
  slot_sum: (p) => `Slot ${p.slot} adds up to ${p.sum}% instead of 100%.`,
  holo_range: "The holo chance must be between 0% and 100%.",
  rarity_without_cards: (p) => `${rarity(p.rarity)}: has a chance in the pack but no cards.`,
  card_incomplete: (p) =>
    `Card ${pad(p.number)}: missing ${String(p.missing ?? "")
      .split(",")
      .filter(Boolean)
      .map((f) => FIELD[f] ?? f)
      .join(", ")}.`,
  card_pending_art: (p) => `Card ${pad(p.number)}: has new art pending review.`,
  card_unreviewed: (p) => `Card ${pad(p.number)}: missing the "clearly adult character" review.`,
};
