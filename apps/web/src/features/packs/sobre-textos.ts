// Spec 030: los textos del sobre de Bruno (sobre-capas.js) desde el diccionario del juego.
import type { Dict } from "@/i18n";

export function sobreTextos(t: Dict["packs"]["sobre"]) {
  return {
    rasgar: { indicacion: t.tear.hint, aria: t.tear.aria },
    sticker: { indicacion: t.sticker.hint, aria: t.sticker.aria },
    sobre: t.pack,
    carta: t.card,
    cartas: t.cards,
    guiaSello: t.guideSeal,
    guiaCorte: t.guideTear,
    guiaLogo: t.guideLogo,
    guiaSet: t.guideSet,
  };
}
