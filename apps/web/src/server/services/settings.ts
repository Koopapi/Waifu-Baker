import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { appSettings, cards, sets } from "@/db/schema";
import { MIN_AGE, isMinAge, type MinAge } from "@/domain/legal/documents";
import { cardDefaultsSchema, parseCardDefaults, type CardDefaults } from "@/domain/cards/card-defaults";
import type { OddsTables, PityDefaults } from "@/domain/catalog/default-odds";
import { oddsTablesProblems, oddsTablesSchema, parseOddsTables, parsePityDefaults, pityDefaultsSchema } from "@/domain/catalog/odds-defaults";
import { coverIdsSchema, coverSelectionProblem, isValidCover, parseCoverIds } from "@/domain/catalog/cover-cards";
import type { Rarity } from "@/domain/catalog/card-rules";
import { bondSettingsSchema, parseBondSettings, type BondSettings } from "@/domain/bonds/settings";
import type { DbLike } from "@/server/db-types";
import { AdminError, AppError } from "@/server/errors";
import { recordAudit } from "./audit";

const MIN_AGE_KEY = "min_age";

/** Spec 010, RF-17 a RF-19: la edad mínima vigente de la web (16 si nunca se cambió). */
export async function getMinAge(db: DbLike): Promise<MinAge> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, MIN_AGE_KEY));
  return isMinAge(row?.value) ? row.value : MIN_AGE;
}

/** RF-17: solo 16 o 18; el cambio queda en el historial con el valor anterior. */
export async function setMinAge(db: DbLike, actorUserId: string, age: number) {
  if (!isMinAge(age)) throw new AppError("invalid_min_age", "La edad mínima solo puede ser 16 o 18 años.");
  const before = await getMinAge(db);
  await db
    .insert(appSettings)
    .values({ key: MIN_AGE_KEY, value: age, updatedBy: actorUserId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: age, updatedBy: actorUserId, updatedAt: new Date() } });
  await recordAudit(db, { actorUserId, action: "settings.min_age", entityType: "settings", entityId: null, before: { minAge: before }, after: { minAge: age } });
  return age;
}

// Spec 028: valores por defecto del panel. Cada uno en su clave de `app_settings`; si falta o no vale, los de fábrica.
const CARD_DEFAULTS_KEY = "card_defaults";
const ODDS_DEFAULTS_KEY = "odds_defaults";
const PITY_DEFAULTS_KEY = "pity_defaults";
const COVER_CARDS_KEY = "cover_cards";

async function readSetting(db: DbLike, key: string): Promise<unknown> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return row?.value ?? null;
}

/** RF-19: guarda el ajuste y deja en la auditoría el valor anterior y el nuevo. */
async function writeSetting(db: DbLike, actorUserId: string, key: string, before: unknown, value: unknown) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedBy: actorUserId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy: actorUserId, updatedAt: new Date() } });
  await recordAudit(db, { actorUserId, action: `settings.${key}`, entityType: "settings", entityId: null, before, after: value });
}

/** RF-15: sello de texto y borde con los que nacen o se re-estilan las cartas. */
export async function getCardDefaults(db: DbLike): Promise<CardDefaults> {
  return parseCardDefaults(await readSetting(db, CARD_DEFAULTS_KEY));
}

export async function setCardDefaults(db: DbLike, actorUserId: string, input: CardDefaults): Promise<CardDefaults> {
  const r = cardDefaultsSchema.safeParse(input);
  if (!r.success) {
    throw new AdminError("invalid_card_defaults", "El sello de texto va de 4 a 40 y el borde de 0 a 8.", { sealMin: 4, sealMax: 40, borderMin: 0, borderMax: 8 });
  }
  const before = await getCardDefaults(db);
  await writeSetting(db, actorUserId, CARD_DEFAULTS_KEY, before, r.data);
  return r.data;
}

/** RF-16: probabilidades por ranura que se proponen a una colección nueva (plata y gold). */
export async function getOddsDefaults(db: DbLike): Promise<OddsTables> {
  return parseOddsTables(await readSetting(db, ODDS_DEFAULTS_KEY));
}

export async function setOddsDefaults(db: DbLike, actorUserId: string, input: OddsTables): Promise<OddsTables> {
  const r = oddsTablesSchema.safeParse(input);
  if (!r.success) throw new AdminError("invalid_odds_defaults", "Cada probabilidad va de 0 a 100.", { reason: "range" });
  const [problem] = oddsTablesProblems(r.data);
  // RF-16: no se guarda nada y se dice qué sobre y qué ranura falla.
  if (problem) {
    throw new AdminError("invalid_odds_defaults", `La fila ${problem.row} del sobre ${problem.kind} no es válida (${problem.code}).`, {
      reason: problem.code,
      kind: problem.kind,
      row: problem.row,
      ...(problem.sum !== undefined ? { sum: problem.sum } : {}),
    });
  }
  const before = await getOddsDefaults(db);
  await writeSetting(db, actorUserId, ODDS_DEFAULTS_KEY, before, r.data);
  return r.data;
}

/** RF-17: sobres de la garantía de épica (plata) y de EX (gold) que se proponen a una colección nueva. */
export async function getPityDefaults(db: DbLike): Promise<PityDefaults> {
  return parsePityDefaults(await readSetting(db, PITY_DEFAULTS_KEY));
}

export async function setPityDefaults(db: DbLike, actorUserId: string, input: PityDefaults): Promise<PityDefaults> {
  const r = pityDefaultsSchema.safeParse(input);
  if (!r.success) throw new AdminError("invalid_pity_defaults", "Cada garantía es un número entero de sobres entre 0 y 100 (0 la desactiva).", { min: 0, max: 100 });
  const before = await getPityDefaults(db);
  await writeSetting(db, actorUserId, PITY_DEFAULTS_KEY, before, r.data);
  return r.data;
}

export interface CoverCandidate {
  id: string;
  setCode: string;
  number: number;
  name: string;
  rarity: Rarity | null;
  keyThumb: string | null;
}

const coverColumns = {
  id: cards.id,
  setCode: sets.code,
  number: cards.number,
  name: cards.name,
  rarity: cards.rarity,
  keyThumb: cards.keyThumb,
  keyPublic: cards.keyPublic,
  setStatus: sets.status,
  setIsAdult: sets.isAdult,
};

/** RF-20: las cartas que se pueden elegir: de colecciones publicadas que no sean 18+ y con imagen pública. */
export async function listCoverCandidates(db: DbLike): Promise<CoverCandidate[]> {
  const rows = await db
    .select(coverColumns)
    .from(cards)
    .innerJoin(sets, eq(sets.id, cards.setId))
    .where(and(eq(sets.status, "published"), eq(sets.isAdult, false), isNotNull(cards.keyPublic)))
    .orderBy(asc(sets.code), asc(cards.number), asc(cards.variant));
  return rows.map((c) => ({ id: c.id, setCode: c.setCode, number: c.number, name: c.name, rarity: c.rarity, keyThumb: c.keyThumb }));
}

/** Las elegidas que siguen valiendo, en su orden (RF-22: las que dejaron de valer no salen). */
async function validCovers(db: DbLike, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.select(coverColumns).from(cards).innerJoin(sets, eq(sets.id, cards.setId)).where(inArray(cards.id, ids));
  const byId = new Map(rows.filter(isValidCover).map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is (typeof rows)[number] => Boolean(r));
}

/** Lo elegido en el panel (también lo que ya no vale, para que el administrador lo vea y lo quite). */
export async function getCoverCards(db: DbLike): Promise<string[]> {
  return parseCoverIds(await readSetting(db, COVER_CARDS_KEY));
}

/** RF-20: de 3 a 5 cartas (o ninguna) de colecciones publicadas que no sean 18+, en el orden del abanico. */
export async function setCoverCards(db: DbLike, actorUserId: string, ids: string[]): Promise<string[]> {
  const parsed = coverIdsSchema.safeParse(ids);
  const problem = parsed.success ? coverSelectionProblem(parsed.data) : "count";
  if (problem) throw new AdminError("invalid_cover_cards", "Elige de 3 a 5 cartas distintas.", { reason: problem, min: 3, max: 5 });
  const valid = await validCovers(db, parsed.data!);
  if (valid.length !== parsed.data!.length) {
    throw new AdminError("invalid_cover_cards", "Solo valen cartas de colecciones publicadas que no sean 18+.", { reason: "invalid", min: 3, max: 5 });
  }
  const before = await getCoverCards(db);
  await writeSetting(db, actorUserId, COVER_CARDS_KEY, before, parsed.data);
  return parsed.data!;
}

export interface PublicCover {
  id: string;
  name: string;
}

/** RF-21 a RF-23: las cartas de portada que se muestran (solo id y nombre: nada de usuarios). */
export async function publicCoverCards(db: DbLike): Promise<PublicCover[]> {
  return (await validCovers(db, await getCoverCards(db))).map((c) => ({ id: c.id, name: c.name }));
}

/** RF-21: la imagen pública con marca de agua de una carta de portada que siga valiendo; si no, null. */
export async function coverCardImageKey(db: DbLike, cardId: string): Promise<string | null> {
  const ids = await getCoverCards(db);
  if (!ids.includes(cardId)) return null;
  const [c] = await validCovers(db, [cardId]);
  return c?.keyPublic ?? null;
}

// Spec 029, RF-14 y RF-22: puntos, polvo, factor holo, costes de fabricar y títulos del vínculo.
const BOND_SETTINGS_KEY = "bond_settings";

export async function getBondSettings(db: DbLike): Promise<BondSettings> {
  return parseBondSettings(await readSetting(db, BOND_SETTINGS_KEY));
}

export async function setBondSettings(db: DbLike, actorUserId: string, input: BondSettings): Promise<BondSettings> {
  const r = bondSettingsSchema.safeParse(input);
  if (!r.success) {
    throw new AdminError("invalid_bond_settings", "Puntos y polvo van de 0 a 100 000, el factor holo de 1 a 5, los costes de 1 a 1 000 000 y cada título hasta 30 caracteres.", { field: String(r.error.issues[0]?.path[0] ?? "") });
  }
  const value = parseBondSettings(r.data);
  const before = await getBondSettings(db);
  await writeSetting(db, actorUserId, BOND_SETTINGS_KEY, before, value);
  return value;
}
