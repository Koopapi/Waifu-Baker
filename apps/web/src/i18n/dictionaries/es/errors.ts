import type { Msg, MsgParams } from "../../types";
import { common } from "./common";
import { plural } from "../../plural";

// Mensajes de error y de validación por código (servicios y dominio). Spec 008, RF-5 y RF-10.
// Reproducen al carácter los mensajes originales de los servicios: los E2E comprueban algunos.

const pad = (n: string | number | undefined) => String(n ?? "").padStart(3, "0");
const rarity = (r: string | number | undefined) => common.rarity[r as keyof typeof common.rarity] ?? String(r ?? "");
const FIELD: Record<string, string> = { character: "personaje", name: "nombre", rarity: "rareza", image: "imagen compuesta" };

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
    return "Las probabilidades no son válidas.";
  }
}

export const errors: Record<string, Msg> = {
  unknown: "Algo ha fallado. Inténtalo de nuevo.",
  welcome_not_allowed: "Solo una colección SFW publicada puede ser la de bienvenida.",
  choose_set: "Elige una colección.",
  set_not_claimable: "Esa colección no está disponible para sobres gratis. Elige otra.",
  invalid_min_age: "La edad mínima solo puede ser 16 o 18 años.",
  album_hidden: "Tu álbum está oculto: cambia el alias y pide una revisión.",
  invalid_moderation_reason: "Elige un motivo de la lista.",
  note_too_long: (p) => `La nota puede tener como mucho ${p.max} caracteres.`,
  album_already_hidden: "Ese álbum ya está oculto.",
  not_hidden: "Tu álbum no está oculto.",
  same_alias: "Escribe un alias distinto del actual.",
  review_pending: "Ya hay una revisión pendiente.",
  review_too_soon: (p) => `Ya pediste una revisión hace poco. Podrás pedir otra a partir del ${new Date(String(p.until)).toLocaleDateString("es", { day: "numeric", month: "long" })}.`,
  review_already_decided: "Esa revisión ya está decidida.",
  no_free_charges: "Todavía no tienes sobres gratis: espera a que se cargue el siguiente.",
  already_claimed_today: "Ya reclamaste la recompensa de hoy. Vuelve mañana.",
  tz_change_too_soon: "Cambiaste de zona horaria hace poco: podrás reclamar cuando pasen 20 horas desde la última recompensa.",
  invalid_cookie_amount: (p) => `La cantidad debe ser un número entero distinto de cero (máximo ${p.max === 100000 ? "100 000" : p.max ?? "100 000"}).`,
  insufficient_cookies: "El saldo no puede quedar por debajo de cero.",
  adult_tier_required: "Para ver contenido 18+ necesitas un tier adulto activo en Patreon.",
  patreon_unavailable: "Patreon no está configurado o no respondió. Inténtalo más tarde.",

  // Genéricos con varios significados: un parámetro distingue cada caso.
  not_found: (p) =>
    ({
      user: "El usuario no existe.",
      set: "La colección no existe.",
      tier_rule: "La regla no existe.",
      drop_table: "La colección no tiene tabla de probabilidades.",
      character: "El personaje no existe.",
      chosen_character: "El personaje elegido ya no existe.",
      pack: "Ese sobre no existe.",
      card: "La carta no existe.",
      selected_cards: "Alguna de las cartas seleccionadas ya no existe.",
    })[String(p.entity)] ?? "No se encontró lo que buscabas.",
  stale_version: (p) => {
    if (p.entity === "set") {
      return p.variant === "short"
        ? "La colección cambió desde que la abriste. Recarga la página."
        : "La colección cambió desde que la abriste. Recarga la página para ver los cambios.";
    }
    if (p.entity === "card") return "La carta cambió desde que la abriste. Recarga para ver la versión actual.";
    if (p.entity === "selected_cards") return "Alguna carta cambió desde que cargaste la página. Recarga y vuelve a intentarlo.";
    return "Los datos cambiaron desde que los abriste. Recarga la página.";
  },
  locked: (p) =>
    ({
      set: "Esta colección ya está publicada: solo puedes cambiar su nombre.",
      odds: "Las probabilidades de una colección publicada no se pueden cambiar (RF-8).",
      odds_version: "Esta versión de probabilidades ya está publicada.",
      cards: "Esta colección ya está publicada: no se pueden añadir, quitar ni cambiar rarezas, variantes o números.",
    })[String(p.what)] ?? "Esta colección ya está publicada.",
  invalid_name: (p) => {
    if (p.reason === "no_alnum") return "El nombre debe contener letras o números.";
    if (p.entity === "card") return `El nombre de la carta admite hasta ${p.max} caracteres.`;
    return `El nombre es obligatorio y admite hasta ${p.max ?? 80} caracteres.`;
  },
  invalid_transition: (p) =>
    p.action === "archive" ? "Solo se puede archivar una colección publicada." : "Solo se puede publicar una colección en borrador.",
  not_grantable: (p) =>
    p.context === "tier"
      ? `${p.set} no está publicada: solo las colecciones publicadas se pueden asignar a un tier.`
      : `${p.set} no está publicada: no se pueden regalar sobres de ella.`,
  age_not_verified: (p) =>
    p.context === "gift"
      ? "Este usuario no ha superado la verificación de edad: no puede recibir sobres 18+."
      : "Este sobre es de una colección 18+: verifica tu edad para abrirlo.",
  missing_original: (p) => (p.what === "pending" ? "No se encontró el arte pendiente." : "No se encontró la imagen original de la carta."),
  duplicate_image: (p) =>
    p.number === undefined ? "Esta imagen ya está en la colección." : `Esta imagen ya está en la colección (carta ${pad(p.number)}).`,
  no_cards: (p) =>
    p.context === "simulate" ? "Asigna rareza al menos a una carta para simular un sobre." : "La colección no tiene cartas.",
  invalid_odds: (p) =>
    p.problems !== undefined
      ? oddsProblems(p.problems)
      : "La protección debe ser un número entero de sobres entre 0 y 100 (0 la desactiva).",

  // Servicios del panel.
  invalid_reason: (p) => `Escribe un motivo de ${p.min ?? 3} a ${p.max ?? 200} caracteres.`,
  invalid_count: (p) => `Se pueden regalar de ${p.min ?? 1} a ${p.max ?? 20} sobres a la vez.`,
  user_deleted: "La cuenta de este usuario está borrada.",
  invalid_packs: (p) => `Los sobres al mes deben ser un número entero entre ${p.min ?? 1} y ${p.max ?? 50}.`,
  invalid_tier: "Falta el tier de Patreon.",
  invalid_code: (p) =>
    `El código debe tener de ${p.min ?? 2} a ${p.max ?? 8} letras o números, sin espacios (por ejemplo WB01).`,
  invalid_pack_size: (p) => `El sobre debe tener entre ${p.min ?? 1} y ${p.max ?? 10} cartas.`,
  duplicate_code: (p) => `Ya existe una colección con el código ${p.code}.`,
  duplicate_slug: (p) => `Ya existe un personaje con el identificador «${p.slug}».`,
  character_in_use: (p) => `Este personaje tiene ${p.count} ${plural(Number(p.count), "carta", "cartas")}. Reasígnalas antes de borrarlo.`,
  invalid_order: "El orden enviado no coincide con las cartas actuales. Recarga la página.",
  not_adult: "Solo las cartas de colecciones 18+ necesitan revisión.",

  // Sobres y álbum del coleccionista.
  geo_blocked:
    "En Bélgica la ley trata los sobres con contenido aleatorio como juego de azar, así que no se pueden abrir desde allí. Tus sobres se conservan.",
  not_published: "Esta colección aún no tiene probabilidades publicadas.",
  no_album: "Activa primero tu álbum público.",
  invalid_alias: (p) => msg("alias_length", p),
  alias_length: (p) => `El alias debe tener entre ${p.min ?? 2} y ${p.max ?? 30} caracteres.`,
  invalid_featured: (p) => msg(String(p.reason ?? "featured_not_owned"), p),
  featured_too_many: (p) => `Puedes destacar hasta ${p.max ?? 5} cartas.`,
  featured_duplicate: "Has elegido la misma carta dos veces.",
  featured_not_owned: "Solo puedes destacar cartas SFW que tengas.",

  // Subida de imágenes.
  unsupported_type: "Formato no admitido: sube PNG, JPEG o WebP.",
  too_large: (p) => `El archivo supera ${p.maxMb ?? 20} MB: redúcelo o expórtalo como WebP.`,
  too_narrow: (p) => `La imagen mide ${p.width} px de ancho; el mínimo es ${p.min} px.`,
  unreadable: "No se pudo leer la imagen: el archivo parece dañado.",

  // Probabilidades y comprobaciones antes de publicar.
  slot_count: (p) => `El sobre tiene ${p.packSize} ${plural(Number(p.packSize), "carta", "cartas")} pero hay ${p.slots} ${plural(Number(p.slots), "ranura", "ranuras")} de probabilidad.`,
  negative_weight: (p) => `La ranura ${p.slot} tiene pesos negativos o no válidos.`,
  slot_sum: (p) => `La ranura ${p.slot} suma ${p.sum} % en vez de 100 %.`,
  holo_range: "La probabilidad de holo debe estar entre 0 % y 100 %.",
  rarity_without_cards: (p) => `${rarity(p.rarity)}: tiene probabilidad en el sobre pero ninguna carta.`,
  card_incomplete: (p) =>
    `Carta ${pad(p.number)}: falta ${String(p.missing ?? "")
      .split(",")
      .filter(Boolean)
      .map((f) => FIELD[f] ?? f)
      .join(", ")}.`,
  card_pending_art: (p) => `Carta ${pad(p.number)}: tiene arte nuevo pendiente de revisión.`,
  card_unreviewed: (p) => `Carta ${pad(p.number)}: falta la revisión «personaje claramente adulto».`,
};
