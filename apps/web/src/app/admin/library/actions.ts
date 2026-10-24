"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { getCardStore } from "@/server/cards/store-instance";
import { removeLibraryItem, renameLibraryItem, saveLibraryFromCard, saveLibraryParticles } from "@/server/services/library";
import type { LibraryImageKind } from "@/domain/cards/library";

// Spec 017 (ampliación): acciones de la biblioteca general. Los avisos de éxito los pone el panel con sus textos.
const PATHS = ["/admin/library"];

export async function renameLibraryItemAction(id: string, name: string): Promise<ActionState> {
  return adminAction("renameLibraryItem", PATHS, async ({ db, actorId }) => {
    await renameLibraryItem(db, actorId, id, name);
  });
}

export async function removeLibraryItemAction(id: string): Promise<ActionState> {
  return adminAction("removeLibraryItem", PATHS, async ({ db, actorId }) => {
    await removeLibraryItem(db, getCardStore(), actorId, id);
  });
}

/** RF-21: «Guardar en la biblioteca» desde el editor de una carta (una imagen o unas partículas). */
export async function saveToLibraryAction(input: { kind: LibraryImageKind; key: string; name: string } | { kind: "particulas"; particles: unknown; name: string }): Promise<ActionState & { id?: string }> {
  let id: string | undefined;
  const r = await adminAction("saveToLibrary", PATHS, async ({ db, actorId }) => {
    const row =
      input.kind === "particulas"
        ? await saveLibraryParticles(db, actorId, { name: input.name, particles: input.particles })
        : await saveLibraryFromCard(db, getCardStore(), actorId, { kind: input.kind, key: input.key, name: input.name });
    id = row.id;
  });
  return { ...r, id };
}
