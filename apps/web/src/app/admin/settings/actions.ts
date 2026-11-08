"use server";

import { adminAction, type ActionState } from "@/server/auth/admin-action";
import { getDict, getLocale } from "@/i18n/server";
import { adminDefaultsDictionaries } from "@/i18n/admin-defaults";
import type { CardDefaults } from "@/domain/cards/card-defaults";
import type { OddsTables, PityDefaults } from "@/domain/catalog/default-odds";
import { setCardDefaults, setCoverCards, setMinAge, setOddsDefaults, setPityDefaults } from "@/server/services/settings";

/** Spec 010, RF-17: cambia la edad mínima de la web (16 o 18). */
export async function setMinAgeAction(age: number): Promise<ActionState> {
  return adminAction("setMinAge", ["/admin/settings"], async ({ db, actorId }) => {
    await setMinAge(db, actorId, age);
    return (await getDict()).admin.settings.minAge.saved(age);
  });
}

const panelT = async () => adminDefaultsDictionaries[await getLocale()];

/** Spec 028, RF-15: sello de texto y borde de las cartas nuevas. */
export async function setCardDefaultsAction(values: CardDefaults): Promise<ActionState> {
  return adminAction("setCardDefaults", ["/admin/settings", "/admin/sets"], async ({ db, actorId }) => {
    await setCardDefaults(db, actorId, { sealSize: Number(values.sealSize), border: Number(values.border) });
    return (await panelT()).cards.saved;
  });
}

/** Spec 028, RF-16: probabilidades iniciales de las colecciones nuevas. */
export async function setOddsDefaultsAction(tables: OddsTables): Promise<ActionState> {
  return adminAction("setOddsDefaults", ["/admin/settings"], async ({ db, actorId }) => {
    await setOddsDefaults(db, actorId, tables);
    return (await panelT()).odds.saved;
  });
}

/** Spec 028, RF-17: garantías de épica (plata) y de EX (gold) de las colecciones nuevas. */
export async function setPityDefaultsAction(values: PityDefaults): Promise<ActionState> {
  return adminAction("setPityDefaults", ["/admin/settings"], async ({ db, actorId }) => {
    await setPityDefaults(db, actorId, { epic: Number(values.epic), ex: Number(values.ex) });
    return (await panelT()).pity.saved;
  });
}

/** Spec 028, RF-20: cartas de la portada pública, en orden. */
export async function setCoverCardsAction(ids: string[]): Promise<ActionState> {
  return adminAction("setCoverCards", ["/admin/settings", "/"], async ({ db, actorId }) => {
    await setCoverCards(db, actorId, Array.isArray(ids) ? ids.map(String) : []);
    return (await panelT()).cover.saved;
  });
}
