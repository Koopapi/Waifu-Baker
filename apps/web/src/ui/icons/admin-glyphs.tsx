// Iconos que solo usa el panel de administración. Van aparte de `glyphs.tsx` porque ese módulo crea todos sus iconos al
// cargarse y viaja a todas las páginas del coleccionista (spec 017: el peso del coleccionista no crece).
import { PencilSimple as PhPencil } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { duotone } from "./glyphs";

export const Pencil = duotone(PhPencil, "Pencil");
