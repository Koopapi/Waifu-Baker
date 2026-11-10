// Spec 030: el diseño de un sobre por capas (formato del creador del paquete de diseño, sobre-capas.js v1) y sus reglas. Puro, sin E/S.
// Se guarda uno por colección y tipo de sobre; las imágenes son claves del almacén propio, nunca URL (RNF seguridad).
import { z } from "zod";
import type { PackKind } from "../catalog/default-odds";
import { BLEND_MODES, PARTICLE_TYPES } from "../cards/layers";

/** Lienzo del arte del sobre (px) y la línea de rasgado (y), como en `SobreCapas.zonas`. */
export const PACK_CANVAS = { width: 1000, height: 1750 } as const;
export const TEAR_LINE_Y = 230;
/** RF-10: miniatura plana del sobre cerrado. */
export const PACK_THUMB = { width: 500, height: 875 } as const;
/** RF-9: desde aquí el nombre del set se achica para caber en la banda. */
export const LONG_NAME = 17;

export const PACK_VIEWS = ["3d", "plano"] as const;
export type PackView = (typeof PACK_VIEWS)[number];
export const PACK_OPENINGS = ["rasgar", "sticker"] as const;
export type PackOpening = (typeof PACK_OPENINGS)[number];
/** RF-5: brillo solo en el dibujo (los de la carta y «ondas que brillan»). */
export const PACK_GLOSS = ["holo", "destello", "oro", "plata", "ondas"] as const;
export type PackGloss = (typeof PACK_GLOSS)[number];
/** RF-7: los 10 patrones holo incluidos (`public/sobres/patrones/<nombre>.webp`). */
export const PACK_PATTERNS = ["liquido", "remolinos", "ondas", "hielo", "estrellas", "panal", "diagonales", "puntos", "aurora", "estelas"] as const;
export type PackPattern = (typeof PACK_PATTERNS)[number];
/** Patrón de fábrica del brillo «ondas que brillan». */
export const DEFAULT_WAVES_PATTERN: PackPattern = "estelas";
export const patternPath = (p: PackPattern) => `/sobres/patrones/${p}.webp`;

/** RF-7: los colores de la marca para los sellos («Colores de la marca»). */
export const BRAND_SEALS = { arriba: "#FF3EA5", abajo: "#C6F432" } as const;
/** RF-15: sellos del sobre básico, plateados en el plata y dorados en el gold. */
export const BASIC_SEALS: Record<PackKind, { arriba: string; abajo: string }> = {
  silver: { arriba: "#C9CED6", abajo: "#8E949E" },
  gold: { arriba: "#F5C451", abajo: "#B7791F" },
};
export const DEFAULT_BADGE_COLOR = "#C6F432";

export const MAX_PACK_IMAGE_LAYERS = 10;
export const MAX_PACK_LAYERS = 24;
export const MAX_BADGE_TEXT = 22;

/** Claves válidas en un diseño: las del almacén propio de esa colección. */
export const packDesignKey = (setId: string, sha: string) => `sets/${setId}/pack-design/${sha}.webp`;
export const packThumbKey = (setId: string, sha: string) => `sets/${setId}/pack-design/thumb-${sha}.webp`;
export const isPackDesignKey = (setId: string, key: string) => new RegExp(`^sets/${escapeRe(setId)}/pack-design/[0-9a-f]{64}\\.webp$`).test(key);
export const isPackThumbKey = (setId: string, key: string) => new RegExp(`^sets/${escapeRe(setId)}/pack-design/thumb-[0-9a-f]{64}\\.webp$`).test(key);
function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** Marca de una imagen nueva en el diseño que manda el editor (`upload:<n>`); el servidor la cambia por su clave. */
export const UPLOAD_REF = /^upload:[a-z0-9-]{1,40}$/;

const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const imageRef = z.string().min(1).max(200);
const fileName = z.string().trim().max(120).optional();

/** Un patrón: uno de los incluidos o una imagen propia. */
const patternSchema = z.union([z.object({ incluido: z.enum(PACK_PATTERNS) }), z.object({ key: imageRef, nombre: fileName })]);

const glossSchema = z.object({
  tipo: z.enum(PACK_GLOSS),
  intensidad: num(0, 1).optional(),
  /** Solo `ondas`: incluido, propio o `null` (arcos CSS). Sin campo, el de fábrica. */
  patron: patternSchema.nullable().optional(),
  patronTamano: num(20, 200).optional(),
});

export const packImageLayerSchema = z.object({
  key: imageRef,
  /** Nombre del archivo subido (solo para la lista del editor). */
  nombre: fileName,
  profundidad: num(0, 2.5).optional(),
  margen: num(0, 15).optional(),
  mezcla: z.enum(BLEND_MODES).optional(),
  opacidad: num(0, 1).optional(),
  visible: z.boolean().optional(),
  brillo: glossSchema.optional(),
});

export const packParticleLayerSchema = z.object({
  particulas: z.enum(PARTICLE_TYPES),
  cantidad: num(0, 200).optional(),
  tamano: num(0.3, 2.5).optional(),
  velocidad: num(0.3, 3).optional(),
  color: hexColor.optional(),
  semilla: z.number().int().min(1).max(2_147_483_646).optional(),
  profundidad: num(0, 2.5).optional(),
  margen: num(0, 15).optional(),
  mezcla: z.enum(BLEND_MODES).optional(),
  opacidad: num(0, 1).optional(),
  visible: z.boolean().optional(),
});

export const packDesignSchema = z.object({
  vista: z.enum(PACK_VIEWS),
  apertura: z.enum(PACK_OPENINGS),
  capas: z.array(z.union([packImageLayerSchema, packParticleLayerSchema])).max(MAX_PACK_LAYERS),
  sellos: z.object({ arriba: hexColor, abajo: hexColor, patron: patternSchema.nullable().optional(), patronTamano: num(10, 150).optional() }),
  logo: z.union([z.boolean(), z.object({ key: imageRef, nombre: fileName })]),
  insignia: z.object({ texto: z.string().trim().min(1).max(MAX_BADGE_TEXT), color: hexColor }).nullable(),
  holo: z.boolean().optional(),
  holoIntensidad: num(0, 1).optional(),
  foil: z.boolean().optional(),
  foilIntensidad: num(0, 1).optional(),
  plastico: num(0, 1.5).optional(),
});

export type PackImageLayer = z.infer<typeof packImageLayerSchema>;
export type PackParticleLayer = z.infer<typeof packParticleLayerSchema>;
export type PackLayer = PackImageLayer | PackParticleLayer;
export type PackPatternRef = z.infer<typeof patternSchema>;
export type PackDesign = z.infer<typeof packDesignSchema>;

export const isPackImageLayer = (l: PackLayer): l is PackImageLayer => "key" in l;

/** Todas las imágenes de un diseño (capas, patrones propios y logo), sin repetir. */
export function designRefs(d: PackDesign): string[] {
  const out: string[] = [];
  const add = (k: string | undefined) => k && !out.includes(k) && out.push(k);
  for (const l of d.capas) {
    if (!isPackImageLayer(l)) continue;
    add(l.key);
    const p = l.brillo?.patron;
    if (p && "key" in p) add(p.key);
  }
  if (d.sellos.patron && "key" in d.sellos.patron) add(d.sellos.patron.key);
  if (typeof d.logo === "object") add(d.logo.key);
  return out;
}

/** Cambia cada imagen del diseño con `map` (de marcas `upload:` a claves, o de claves a enlaces). */
export function mapRefs(d: PackDesign, map: (ref: string) => string): PackDesign {
  const pat = (p: PackPatternRef | null | undefined) => (p && "key" in p ? { ...p, key: map(p.key) } : p);
  return {
    ...d,
    capas: d.capas.map((l) => (isPackImageLayer(l) ? { ...l, key: map(l.key), ...(l.brillo ? { brillo: { ...l.brillo, ...(l.brillo.patron !== undefined ? { patron: pat(l.brillo.patron) } : {}) } } : {}) } : l)),
    sellos: { ...d.sellos, ...(d.sellos.patron !== undefined ? { patron: pat(d.sellos.patron) } : {}) },
    logo: typeof d.logo === "object" ? { ...d.logo, key: map(d.logo.key) } : d.logo,
  };
}

export type PackDesignIssue = { code: "invalid_pack_design"; path: string };

/**
 * RF-12 y RNF seguridad: forma válida (modos de mezcla, colores en hexadecimal, rangos) y todas las imágenes del
 * almacén propio de la colección. `allowUploads` deja pasar las marcas `upload:<n>` (el diseño que manda el editor
 * antes de guardar sus imágenes). El error dice qué campo falla.
 */
export function checkPackDesign(input: unknown, setId: string, opts: { allowUploads?: boolean } = {}): { ok: true; design: PackDesign } | { ok: false; issue: PackDesignIssue } {
  const parsed = packDesignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, issue: { code: "invalid_pack_design", path: parsed.error.issues[0]?.path.join(".") || "design" } };
  const design = parsed.data;
  if (design.capas.filter(isPackImageLayer).length > MAX_PACK_IMAGE_LAYERS) return { ok: false, issue: { code: "invalid_pack_design", path: "capas" } };
  const bad = refPaths(design).find(({ ref }) => !(isPackDesignKey(setId, ref) || (opts.allowUploads && UPLOAD_REF.test(ref))));
  if (bad) return { ok: false, issue: { code: "invalid_pack_design", path: bad.path } };
  return { ok: true, design };
}

/** Cada imagen del diseño con la ruta de su campo (para decir cuál falla). */
function refPaths(d: PackDesign): { ref: string; path: string }[] {
  const out: { ref: string; path: string }[] = [];
  d.capas.forEach((l, i) => {
    if (!isPackImageLayer(l)) return;
    out.push({ ref: l.key, path: `capas.${i}.key` });
    const p = l.brillo?.patron;
    if (p && "key" in p) out.push({ ref: p.key, path: `capas.${i}.brillo.patron.key` });
  });
  if (d.sellos.patron && "key" in d.sellos.patron) out.push({ ref: d.sellos.patron.key, path: "sellos.patron.key" });
  if (typeof d.logo === "object") out.push({ ref: d.logo.key, path: "logo.key" });
  return out;
}

/** Lo que el sobre toma de la colección (RF-8): no se cambia en el editor. */
export interface PackInfo {
  nombre: string;
  codigo: string;
  cartas: number;
}

/** El registro que recibe `SobreCapas.montar` (mismo formato que `SobreRegistro` de ui/game/sobre-capas). */
export interface PackRegistro {
  id?: string;
  nombre: string;
  codigo: string;
  cartas: number;
  vista: PackView;
  apertura: PackOpening;
  capas: Record<string, unknown>[];
  sellos: { arriba: string; abajo: string; patron?: string | null; patronTamano?: number };
  logo: boolean | { src: string };
  insignia: { texto: string; color?: string } | null;
  holo?: boolean;
  holoIntensidad?: number;
  foil?: boolean;
  foilIntensidad?: number;
  plastico?: number;
}

const patternUrl = (p: PackPatternRef, url: (key: string) => string) => ("incluido" in p ? patternPath(p.incluido) : url(p.key));

/** RF-14: del diseño guardado al registro del componente, con `url` para cada clave (enlace firmado o del panel). */
export function toRegistro(d: PackDesign, info: PackInfo, url: (key: string) => string): PackRegistro {
  const capas = d.capas.map((l): Record<string, unknown> => {
    if (!isPackImageLayer(l)) return { ...l };
    const { key, brillo, ...rest } = l;
    // El nombre del archivo solo sirve en el editor: no va al registro.
    const out: Record<string, unknown> = { ...rest, src: url(key) };
    delete out.nombre;
    if (brillo) {
      const { patron, ...b } = brillo;
      out.brillo = brillo.tipo !== "ondas" ? { tipo: b.tipo, intensidad: b.intensidad } : { ...b, ...(patron === null ? { patron: null } : patron ? { patron: patternUrl(patron, url) } : {}) };
    }
    return out;
  });
  const { patron, ...sellos } = d.sellos;
  return {
    nombre: info.nombre,
    codigo: info.codigo,
    cartas: info.cartas,
    vista: d.vista,
    apertura: d.apertura,
    capas,
    sellos: { ...sellos, patron: patron ? patternUrl(patron, url) : null },
    logo: typeof d.logo === "object" ? { src: url(d.logo.key) } : d.logo,
    insignia: d.insignia,
    holo: d.holo,
    holoIntensidad: d.holoIntensidad,
    foil: d.foil,
    foilIntensidad: d.foilIntensidad,
    plastico: d.plastico,
  };
}

/**
 * RF-15: el sobre del paquete de diseño básico, sin diseño propio: la portada (o el sobre a mano) de la colección como arte, sellos
 * plateados en el plata y dorados en el gold, logo de Waifu Baker, 3D y rasgar.
 */
export function basicRegistro(kind: PackKind, info: PackInfo, art: string | null): PackRegistro {
  return {
    nombre: info.nombre,
    codigo: info.codigo,
    cartas: info.cartas,
    vista: "3d",
    apertura: "rasgar",
    capas: art ? [{ src: art, profundidad: 0.25, margen: 3 }] : [],
    sellos: { ...BASIC_SEALS[kind], patron: null },
    logo: true,
    insignia: null,
  };
}

/** Diseño de partida del editor cuando la colección no tiene uno: el básico sin arte (capas vacías). */
export function emptyDesign(kind: PackKind): PackDesign {
  return { vista: "3d", apertura: "rasgar", capas: [], sellos: { ...BASIC_SEALS[kind], patron: null, patronTamano: 40 }, logo: true, insignia: null, holo: false, holoIntensidad: 0.4, foil: true, foilIntensidad: 0.6, plastico: 1 };
}

/** Movimiento reducido (RNF): sin partículas. */
export function withoutParticles(r: PackRegistro): PackRegistro {
  return { ...r, capas: r.capas.filter((c) => !("particulas" in c)) };
}
