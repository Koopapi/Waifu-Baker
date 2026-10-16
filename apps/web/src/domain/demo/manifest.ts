import { z } from "zod";
import { RARITIES } from "@/domain/catalog/card-rules";

// Spec 010, RF-12: qué cartas lleva la colección de la demo. Las imágenes viven en el taller de arte
// (ART_DIR) y no se suben a git; el manifiesto solo guarda rutas relativas, nombres y rarezas.

const Card = z.object({
  file: z
    .string()
    .regex(/^[\w./-]+\.(webp|png|jpe?g)$/i)
    .refine((f) => !f.startsWith("/") && !f.split("/").includes(".."), "La imagen debe estar dentro del taller de arte."),
  character: z.string().min(1),
  title: z.string().min(1),
  rarity: z.enum(RARITIES),
});
const Manifest = z.object({ code: z.string().regex(/^[A-Z0-9]{2,8}$/), name: z.string().min(1), cards: z.array(Card).min(1) });
export type DemoManifest = z.infer<typeof Manifest>;

/**
 * Valida el manifiesto. `bannedNames`: nombres reales de los personajes, que no pueden aparecer en
 * ningún nombre ni título (RF-12: las cartas llevan nombres propios).
 */
export function parseDemoManifest(raw: unknown, bannedNames: string[] = []): DemoManifest {
  const m = Manifest.parse(raw);
  const seen = new Set<string>();
  for (const c of m.cards) {
    const key = `${c.character}/${c.title}`;
    if (seen.has(key)) throw new Error(`Carta repetida: ${c.character} · ${c.title}`);
    seen.add(key);
    for (const banned of bannedNames) {
      const re = new RegExp(`\\b${banned}\\b`, "i");
      if (re.test(c.character) || re.test(c.title)) throw new Error(`Nombre real en la carta «${c.character} · ${c.title}»: ${banned.replace(/^./, (x) => x.toUpperCase())}`);
    }
  }
  return m;
}
