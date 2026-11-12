// Spec 037, RF-12, RF-13, RF-19 y RF-20: qué imagen fija pide una vista para una copia de una carta.
import type { ImageSize } from "@/domain/signed-url";

export interface FlatImageChoice {
  size: ImageSize;
  /** La copia es holo pero la carta no tiene imagen holo: la vista añade su acabado o insignia holo. */
  holoFinish: boolean;
}

/** `holoCopy`: la copia que se muestra es holo; `holoImage`: la carta tiene imagen fija holo. */
export function flatImageFor(size: "thumb" | "mid", copy: { holoCopy: boolean; holoImage: boolean }): FlatImageChoice {
  if (!copy.holoCopy) return { size, holoFinish: false };
  if (copy.holoImage) return { size: `${size}-holo`, holoFinish: false };
  return { size, holoFinish: true };
}
