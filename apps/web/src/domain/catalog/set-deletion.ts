// Spec 032: cuándo se puede eliminar una colección del panel. Reglas puras.
import type { SetStatus } from "./collection-rules";

/** Otros lugares del sitio que usan la colección (RF-11); mientras alguno la use, no se elimina. */
export type SetUse = { kind: "welcome" } | { kind: "cover_cards"; count: number } | { kind: "tier_rule"; name: string };

export type DeletionBlocker = { kind: "owners"; count: number } | SetUse;

/** RF-4: el código escrito vale sin distinguir mayúsculas y sin espacios alrededor. */
export function matchesCode(typed: string, code: string): boolean {
  return typed.trim().toUpperCase() === code.trim().toUpperCase();
}

/** RF-8 y RF-11: los motivos para no eliminar; sin motivos, se puede eliminar. */
export function deletionBlockers(input: { owners: number; uses: readonly SetUse[] }): DeletionBlocker[] {
  return [...(input.owners > 0 ? [{ kind: "owners" as const, count: input.owners }] : []), ...input.uses];
}

/** RF-10: con dueños, una colección publicada se puede archivar en su lugar. */
export function canOfferArchive(status: SetStatus, blockers: readonly DeletionBlocker[]): boolean {
  return status === "published" && blockers.some((b) => b.kind === "owners");
}
