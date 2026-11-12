import type { Msg } from "../../types";

// Errores que solo se traducen en el servidor (rutas y acciones del panel de capas, spec 017): no van en el
// diccionario general, que viaja a todas las páginas del coleccionista. Los suma `getDict()`.
export const panelErrors: Record<string, Msg> = {
  // Spec 030: diseño del sobre (RF-12: dice qué campo falla).
  invalid_pack_design: (p) => `El diseño del sobre no es válido${p.path ? ` (${p.path})` : ""}. No se guardó.`,
  pack_upload_missing: (p) => `No llegó una imagen del diseño${p.path ? ` (${p.path})` : ""}: vuelve a añadirla y guarda.`,
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
  invalid_item_name: "Ponle un nombre al elemento.",
  flatten_failed: "No se pudo generar la imagen de la carta. Revisa sus capas y vuelve a intentarlo.",
  no_pending_layers: "Esta carta no tiene cambios de capas pendientes.",
  // Spec 020: Expediciones (coleccionista y panel).
  invalid_terrain: "Ese terreno no existe.",
  invalid_role: "Ese rol no existe.",
  invalid_zone: (p) =>
    ({
      name: "El nombre de la zona es obligatorio y admite hasta 40 caracteres.",
      terrain: "Ese terreno no existe.",
      difficulty: "La dificultad va de 1 a 1000.",
      fragments: "Los fragmentos para abrirla van de 0 a 999.",
      order: "El orden va de 0 a 99.",
      loot: "El botín de cada duración necesita galletas (0 a 10 000), fragmentos (0 a 100) y una probabilidad de sobre de 0 a 100 %.",
    })[String(p.field)] ?? "La zona no es válida.",
  invalid_team: "El equipo lleva de 1 a 3 cartas distintas.",
  invalid_duration: "La duración debe ser 30 min, 2 h u 8 h.",
  zone_locked: "Esa zona sigue con niebla: ábrela con fragmentos de mapa.",
  no_free_slot: (p) => `Tus ${p.slots} espacios están ocupados: reclama o cancela una expedición.`,
  card_not_owned: "Esa carta no está en tu colección.",
  card_busy: "Esa carta ya está en otra expedición.",
  expedition_not_active: "Esa expedición ya terminó.",
  expedition_returned: "El equipo ya volvió: reclama su botín.",
  not_returned: "El equipo todavía no ha vuelto.",
  pack_not_pending: "Esa expedición no tiene un sobre por elegir.",
  not_enough_fragments: (p) => `Te faltan fragmentos de mapa: tienes ${p.have} de ${p.need}.`,
  free_adult: "Una colección 18+ no puede ser gratuita.",
  // Spec 028: ajustes de cartas nuevas, colecciones nuevas y portada.
  invalid_card_defaults: (p) => `El sello de texto va de ${p.sealMin} a ${p.sealMax} y el borde de ${p.borderMin} a ${p.borderMax}.`,
  invalid_odds_defaults: (p) => {
    if (p.reason === "range") return "Cada probabilidad va de 0 a 100.";
    const where = `Sobre ${p.kind === "gold" ? "gold" : "plata"}, ${({ base: "ranuras normales", boosted: "ranura mejorada", guaranteed: "última ranura" } as Record<string, string>)[String(p.row)] ?? String(p.row)}`;
    if (p.reason === "slot_sum") return `${where}: suma ${p.sum} % en vez de 100 %. No se guardó nada.`;
    if (p.reason === "guarantee_slot") return `${where}: solo puede dar ${p.kind === "gold" ? "Ultra Rare" : "Rare"} o mejor. No se guardó nada.`;
    return `${where}: las probabilidades no pueden ser negativas. No se guardó nada.`;
  },
  invalid_bond_settings: "Puntos y polvo van de 0 a 100 000, el factor holo de 1 a 5, los costes de 1 a 1 000 000 y cada título hasta 30 caracteres.",
  invalid_pity_defaults: (p) => `Cada garantía es un número entero de sobres de ${p.min} a ${p.max} (0 la desactiva).`,
  invalid_cover_cards: (p) =>
    p.reason === "duplicate"
      ? "Cada carta de portada solo se puede elegir una vez."
      : p.reason === "invalid"
        ? "Solo valen cartas de colecciones publicadas que no sean 18+."
        : `Elige de ${p.min} a ${p.max} cartas de portada (o ninguna).`,
};
