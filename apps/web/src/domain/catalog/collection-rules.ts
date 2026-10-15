// RF-5, RF-8, RF-9: qué permite cada estado de una colección. Reglas puras.

export type SetStatus = "draft" | "published" | "archived";

/** Campos o acciones que el panel puede intentar cambiar. */
export type EditableField =
  | "setName"
  | "name"
  | "flavorText"
  | "art"
  | "rarity"
  | "variant"
  | "number"
  | "addCard"
  | "removeCard"
  | "odds"
  | "isAdult"
  | "packSize"
  | "code";

/** Lo único editable tras publicar: no altera probabilidades ni el contenido del sorteo. */
const ALWAYS_EDITABLE: ReadonlySet<EditableField> = new Set(["setName", "name", "flavorText", "art"]);

export function canEdit(status: SetStatus, field: EditableField): boolean {
  return status === "draft" || ALWAYS_EDITABLE.has(field);
}

export const isListedForUsers = (status: SetStatus) => status === "published";
export const canGrantPacks = (status: SetStatus) => status === "published";
export const canOpenPacks = (status: SetStatus) => status === "published" || status === "archived";

const TRANSITIONS: Record<SetStatus, SetStatus[]> = {
  draft: ["published"],
  published: ["archived"],
  archived: [],
};

export function nextStatusAllowed(from: SetStatus, to: SetStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const STATUS_LABEL: Record<SetStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  archived: "Archivada",
};
