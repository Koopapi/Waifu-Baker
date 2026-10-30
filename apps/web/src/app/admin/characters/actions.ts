"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { createCharacter, deleteCharacter, updateCharacter } from "@/server/services/characters";
import { getDict } from "@/i18n/server";
import type { Role, Terrain } from "@/domain/expeditions/rules";

const orNull = <T extends string>(v: FormDataEntryValue | null) => (v ? (String(v) as T) : null);

const PATHS = ["/admin/characters", "/admin"];

export async function createCharacterAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("createCharacter", PATHS, async ({ db, actorId }) => {
    const c = await createCharacter(db, actorId, {
      name: String(fd.get("name") ?? ""),
      bio: String(fd.get("bio") ?? ""),
      identityTags: String(fd.get("identityTags") ?? ""),
    });
    const terrain = orNull<Terrain>(fd.get("terrain"));
    const role = orNull<Role>(fd.get("role"));
    if (terrain || role) await updateCharacter(db, actorId, c.id, { terrain, role });
    return (await getDict()).admin.characters.created(c.name);
  });
}

export async function updateCharacterAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("updateCharacter", PATHS, async ({ db, actorId }) => {
    await updateCharacter(db, actorId, String(fd.get("id")), {
      name: String(fd.get("name") ?? ""),
      bio: String(fd.get("bio") ?? ""),
      identityTags: String(fd.get("identityTags") ?? ""),
      terrain: orNull<Terrain>(fd.get("terrain")),
      role: orNull<Role>(fd.get("role")),
    });
    return (await getDict()).admin.changesSaved;
  });
}

export async function deleteCharacterAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("deleteCharacter", PATHS, async ({ db, actorId }) => {
    await deleteCharacter(db, actorId, String(fd.get("id")));
    return (await getDict()).admin.characters.deleted;
  });
}
