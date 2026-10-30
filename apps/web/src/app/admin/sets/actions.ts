"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { archiveSet, createSet, publishSet, saveOdds, setFreeSet, updateSet } from "@/server/services/collections";
import type { Problem } from "@/domain/catalog/odds";
import { parsePackKind } from "@/domain/catalog/default-odds";
import { RARITIES, type Rarity } from "@/domain/catalog/card-rules";
import { getDict } from "@/i18n/server";
import { setWelcomeSet } from "@/server/services/welcome";
import { removePackImage, setCoverCard } from "@/server/services/pack-art";
import { getCardStore } from "@/server/cards/store-instance";

export async function createSetAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  return adminAction("createSet", ["/admin/sets", "/admin"], async ({ db, actorId }) => {
    const s = await createSet(db, actorId, {
      code: String(fd.get("code") ?? ""),
      name: String(fd.get("name") ?? ""),
      isAdult: fd.get("isAdult") === "on",
      packSize: Number(fd.get("packSize") ?? 5),
    });
    return (await getDict()).admin.sets.created(s.code);
  });
}

export async function updateSetAction(_: ActionState | null, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id"));
  return adminAction("updateSet", ["/admin/sets", `/admin/sets/${id}`], async ({ db, actorId }) => {
    const patch: { name?: string; isAdult?: boolean; packSize?: number } = { name: String(fd.get("name") ?? "") };
    // Los campos bloqueados llegan deshabilitados y no se envían: solo se tocan si vienen.
    if (fd.has("packSize")) patch.packSize = Number(fd.get("packSize"));
    if (fd.has("adultField")) patch.isAdult = fd.get("isAdult") === "on";
    await updateSet(db, actorId, id, Number(fd.get("version")), patch);
    return (await getDict()).admin.changesSaved;
  });
}

const paths = (id: string) => ["/admin/sets", `/admin/sets/${id}`, "/admin", "/drop-rates"];

export async function saveOddsAction(
  setId: string,
  version: number,
  slots: Record<string, number>[],
  holoPercent: number,
  pityThreshold: number,
  kind?: string,
): Promise<ActionState> {
  return adminAction("saveOdds", paths(setId), async ({ db, actorId }) => {
    const clean = slots.map((s) => Object.fromEntries(RARITIES.map((r) => [r, Number(s[r] ?? 0)])) as Record<Rarity, number>);
    await saveOdds(db, actorId, setId, version, { slots: clean, holoChance: holoPercent / 100, pityThreshold, kind: parsePackKind(kind) });
    return (await getDict()).admin.sets.oddsSaved;
  });
}

export async function publishSetAction(setId: string, version: number): Promise<ActionState & { problems?: Problem[] }> {
  let problems: Problem[] = [];
  const r = await adminAction("publishSet", paths(setId), async ({ db, actorId }) => {
    problems = (await publishSet(db, actorId, setId, version)).problems;
    return problems.length ? undefined : (await getDict()).admin.sets.published;
  });
  return problems.length ? { ok: false, error: (await getDict()).admin.sets.cannotPublish(problems.length), problems } : r;
}

export async function archiveSetAction(setId: string, version: number): Promise<ActionState> {
  return adminAction("archiveSet", paths(setId), async ({ db, actorId }) => {
    await archiveSet(db, actorId, setId, version);
    return (await getDict()).admin.sets.archived;
  });
}

/** Spec 001, RF-5: marca (o desmarca) la colección de bienvenida. */
export async function setWelcomeSetAction(setId: string, makeWelcome: boolean): Promise<ActionState> {
  return adminAction("setWelcomeSet", ["/admin/sets", `/admin/sets/${setId}`], async ({ db, actorId }) => {
    await setWelcomeSet(db, actorId, makeWelcome ? setId : null);
    return (await getDict()).admin.set.welcome.made;
  });
}

/** Spec 021, RF-1: gratuita (fuentes gratis) o de Patreon. */
export async function setFreeSetAction(setId: string, free: boolean): Promise<ActionState> {
  return adminAction("setFreeSet", ["/admin/sets", `/admin/sets/${setId}`, "/drop-rates"], async ({ db, actorId }) => {
    await setFreeSet(db, actorId, setId, free);
    return (await getDict()).admin.set.free.made;
  });
}

/** Spec 014, RF-6: elige (o vuelve a la automática, con `null`) la carta de portada del sobre. */
export async function setCoverAction(setId: string, cardId: string | null): Promise<ActionState> {
  return adminAction("setCover", [`/admin/sets/${setId}`, "/packs"], async ({ db, actorId }) => {
    await setCoverCard(db, actorId, setId, cardId);
    return (await getDict()).admin.set.pack.coverSaved;
  });
}

/** Spec 014, RF-7: quita el sobre hecho a mano. */
export async function removePackImageAction(setId: string): Promise<ActionState> {
  return adminAction("removePackImage", [`/admin/sets/${setId}`, "/packs"], async ({ db, actorId }) => {
    await removePackImage(db, getCardStore(), actorId, setId);
    return (await getDict()).admin.set.pack.removed;
  });
}
