import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  bigserial,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Theme } from "@/domain/ui/theme";
import type { LayersConfig } from "@/domain/cards/layers";
import type { ParticlePreset } from "@/domain/cards/library";
import type { PickedPhrase } from "@/domain/expeditions/report";
import type { DurationLoot, Rating, ZoneLoot } from "@/domain/expeditions/rules";

/** Spec 016: imagen plana de una configuración pendiente de revisión, en sus cuatro tamaños. */
export interface PendingFlatKeys {
  full: string;
  mid: string;
  thumb: string;
  public: string;
  blurhash: string;
}

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const setStatus = pgEnum("set_status", ["draft", "published", "archived"]);
// Spec 022, RF-1: cinco rarezas. RF-11: dos tipos de sobre.
export const rarity = pgEnum("rarity", ["common", "rare", "epic", "legendary", "ex"]);
export const packKind = pgEnum("pack_kind", ["silver", "gold"]);
export const cardVariant = pgEnum("card_variant", ["normal", "holo", "alt"]);
export const cardStatus = pgEnum("card_status", ["draft", "ready"]);
export const albumModeration = pgEnum("album_moderation", ["none", "hidden", "review_requested", "review_rejected"]);
export const packSource = pgEnum("pack_source", ["tier_grant", "manual", "promo", "free", "daily", "expedition"]);
/** Spec 020: terreno y rol de las personajes en Expediciones. */
export const expeditionTerrain = pgEnum("expedition_terrain", ["city", "forest", "coast", "ruins", "mountain"]);
export const expeditionRole = pgEnum("expedition_role", ["gatherer", "cartographer", "treasure_hunter"]);
export const expeditionStatus = pgEnum("expedition_status", ["active", "claimed", "cancelled"]);
export const packStatus = pgEnum("pack_status", ["sealed", "opened", "void"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull().default(""),
  avatarUrl: text("avatar_url"),
  patreonUserId: text("patreon_user_id").unique(),
  role: userRole("role").notNull().default("user"),
  isAdultDeclared: boolean("is_adult_declared").notNull().default(false),
  adultDeclaredAt: timestamp("adult_declared_at", { withTimezone: true }),
  adultVerifiedAt: timestamp("adult_verified_at", { withTimezone: true }),
  lastCountry: text("last_country"),
  ...timestamps,
  /** Spec 001: cuenta desactivada por su dueño (se puede recuperar 30 días). */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  /** Spec 001: borrado definitivo hecho; la fila queda anónima. */
  purgedAt: timestamp("purged_at", { withTimezone: true }),
  /** Spec 007: confirmó tener la edad mínima y aceptó esta versión de los términos. */
  ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
  termsVersion: integer("terms_version"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  /** Spec 010, RF-18: la edad mínima que confirmó (si sube la de la web, se le vuelve a pedir). */
  ageConfirmedMin: integer("age_confirmed_min"),
  /** Spec 015, RF-8: última visita a «Mis sobres»; las llegadas posteriores llevan «¡Nuevo!». */
  packsSeenAt: timestamp("packs_seen_at", { withTimezone: true }),
  /** Spec 026, RF-6: el tema que eligió en «Mi cuenta» (`domain/ui/theme.ts`). */
  theme: text("theme").$type<Theme>().notNull().default("kawaii"),
}, (t) => [check("users_theme_check", sql`${t.theme} in ('kawaii', 'street')`)]);

export const characters = pgTable("characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio").notNull().default(""),
  identityTags: text("identity_tags").notNull().default(""),
  refImageId: text("ref_image_id"),
  /** Spec 020, RF-27: terreno y rol en Expediciones (sin asignar = sin bonus de terreno ni efecto de rol). */
  terrain: expeditionTerrain("terrain"),
  role: expeditionRole("role"),
  ...timestamps,
});

export const sets = pgTable("sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isAdult: boolean("is_adult").notNull().default(false),
  status: setStatus("status").notNull().default("draft"),
  packSize: integer("pack_size").notNull().default(5),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  /** Spec 001, RF-5: colección de la que sale el sobre de bienvenida (solo una). */
  isWelcome: boolean("is_welcome").notNull().default(false),
  /** Spec 021, RF-1: gratuita (sale en las fuentes gratis) o, por defecto, de Patreon. Nunca 18+ (RF-2). */
  isFree: boolean("is_free").notNull().default(false),
  /** Spec 014, RF-6: carta de portada del sobre (si no hay, la de mayor rareza). */
  coverCardId: uuid("cover_card_id").references((): AnyPgColumn => cards.id, { onDelete: "set null" }),
  /** Spec 014, RF-7: sobre diseñado a mano; mientras exista, sustituye al compuesto. */
  packImageKey: text("pack_image_key"),
  ...timestamps,
}, (t) => [uniqueIndex("sets_single_welcome_uq").on(t.isWelcome).where(sql`${t.isWelcome}`), check("sets_free_not_adult", sql`not (${t.isFree} and ${t.isAdult})`)]);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    characterId: uuid("character_id").references(() => characters.id, { onDelete: "restrict" }),
    name: text("name").notNull().default(""),
    flavorText: text("flavor_text").notNull().default(""),
    rarity: rarity("rarity"),
    variant: cardVariant("variant").notNull().default("normal"),
    baseCardId: uuid("base_card_id"),
    status: cardStatus("status").notNull().default("draft"),
    originalKey: text("original_key"),
    originalSha256: text("original_sha256").notNull(),
    pendingOriginalKey: text("pending_original_key"),
    width: integer("width"),
    height: integer("height"),
    keyFull: text("key_full"),
    keyMid: text("key_mid"),
    keyThumb: text("key_thumb"),
    keyPublic: text("key_public"),
    blurhash: text("blurhash"),
    adultReviewedBy: uuid("adult_reviewed_by").references(() => users.id),
    adultReviewedAt: timestamp("adult_reviewed_at", { withTimezone: true }),
    seed: bigint("seed", { mode: "number" }),
    promptSha256: text("prompt_sha256"),
    sourceJob: text("source_job"),
    version: integer("version").notNull().default(1),
    // Spec 016: configuración por capas vigente (null = carta sin capas) y la pendiente de revisión (18+ publicada),
    // con la imagen plana de lo pendiente. La imagen plana vigente va en key_* como la compuesta.
    layers: jsonb("layers").$type<LayersConfig>(),
    layersPending: jsonb("layers_pending").$type<LayersConfig>(),
    pendingKeys: jsonb("pending_keys").$type<PendingFlatKeys>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cards_set_number_variant_uq").on(t.setId, t.number, t.variant),
    uniqueIndex("cards_set_sha_uq").on(t.setId, t.originalSha256),
    index("cards_set_rarity_idx").on(t.setId, t.rarity),
  ],
);

export const libraryKind = pgEnum("library_kind", ["fondo", "sello", "adorno", "particulas"]);

/**
 * Spec 017, RF-6 a RF-9 y RF-21: biblioteca general de elementos, común a todas las colecciones. Las imágenes viven en
 * `library/<sha>.webp` (o en la clave que ya tenían los fondos de antes); las partículas guardadas, en `particles`.
 * Una imagen está «en uso» si su clave aparece en la configuración por capas de alguna carta.
 */
export const libraryItems = pgTable(
  "library_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: libraryKind("kind").notNull(),
    name: text("name").notNull(),
    key: text("key"),
    sha256: text("sha256"),
    particles: jsonb("particles").$type<ParticlePreset>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("library_items_sha_uq").on(t.sha256).where(sql`${t.sha256} is not null`)],
);

export const dropTables = pgTable(
  "drop_tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    /** Spec 022, RF-12: una tabla por tipo de sobre. */
    kind: packKind("kind").notNull().default("silver"),
    /** Una entrada por ranura del sobre: pesos por rareza. */
    slots: jsonb("slots").$type<Record<string, number>[]>().notNull().default(sql`'[]'::jsonb`),
    holoChance: doublePrecision("holo_chance").notNull().default(0.2),
    /** Protección de mala suerte: N sobres; 0 la desactiva (spec 004, RF-12). */
    pityThreshold: integer("pity_threshold").notNull().default(10),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isPublic: boolean("is_public").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("drop_tables_set_kind_version_uq").on(t.setId, t.kind, t.version)],
);

export const tierRules = pgTable(
  "tier_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patreonTierId: text("patreon_tier_id").notNull(),
    name: text("name").notNull().default(""),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id),
    packsPerMonth: integer("packs_per_month").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("tier_rules_tier_set_uq").on(t.patreonTierId, t.setId)],
);

export const packs = pgTable(
  "packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id),
    source: packSource("source").notNull(),
    /** Spec 022, RF-11: plata o gold. */
    kind: packKind("kind").notNull().default("silver"),
    grantKey: text("grant_key").notNull().unique(),
    /** Spec 001: ciclo de cobro de Patreon que concedió el sobre (para anularlo si se reembolsa). */
    cycleKey: text("cycle_key"),
    status: packStatus("status").notNull().default("sealed"),
    reason: text("reason"),
    grantedBy: uuid("granted_by").references(() => users.id),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    /** Spec 015, RF-7: una llegada (bienvenida, regalo, suscripción) se celebra una sola vez. */
    celebratedAt: timestamp("celebrated_at", { withTimezone: true }),
  },
  (t) => [index("packs_user_status_idx").on(t.userId, t.status)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    meta: jsonb("meta"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId)],
);

/** Resultado inmutable de abrir un sobre (spec 004). Aquí solo se consulta desde el panel. */
export const packOpenings = pgTable("pack_openings", {
  id: uuid("id").primaryKey().defaultRandom(),
  packId: uuid("pack_id")
    .notNull()
    .unique()
    .references(() => packs.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  dropTableId: uuid("drop_table_id")
    .notNull()
    .references(() => dropTables.id),
  serverSeed: text("server_seed").notNull(),
  rngVersion: text("rng_version").notNull(),
  rolls: jsonb("rolls").notNull(),
  cardIds: uuid("card_ids").array().notNull(),
  pityApplied: boolean("pity_applied").notNull().default(false),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  clientAckAt: timestamp("client_ack_at", { withTimezone: true }),
});

/** Inventario de cada usuario (spec 004/006). */
export const userCards = pgTable(
  "user_cards",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    /** Las versiones holo cuentan aparte (spec 004, RF-10). */
    holo: boolean("holo").notNull().default(false),
    qty: integer("qty").notNull().default(1),
    firstObtainedAt: timestamp("first_obtained_at", { withTimezone: true }).notNull().defaultNow(),
    lastObtainedAt: timestamp("last_obtained_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cardId, t.holo] })],
);

/** Sobres seguidos sin épica o superior, por usuario y colección (spec 004, RF-13/RF-14). */
export const pityCounters = pgTable(
  "pity_counters",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    packsSinceEpic: integer("packs_since_epic").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.setId] })],
);

/** Álbum público de cada usuario (spec 006). Desactivado hasta que el usuario lo activa. */
export const albums = pgTable("albums", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  slug: text("slug").notNull().unique(),
  isPublic: boolean("is_public").notNull().default(false),
  alias: text("alias").notNull().default("Coleccionista"),
  featuredCardIds: uuid("featured_card_ids").array().notNull().default(sql`'{}'::uuid[]`),
  /** Spec 012: primera activación (para la lista de moderación). */
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  /** Spec 012: estado de moderación; solo `none` se ve en público. */
  moderation: albumModeration("moderation").notNull().default("none"),
  hiddenReason: text("hidden_reason"),
  hiddenNote: text("hidden_note"),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  hiddenBy: uuid("hidden_by").references(() => users.id),
  /** Alias que propone el dueño al pedir revisión, y nota del administrador si la rechaza. */
  reviewAlias: text("review_alias"),
  reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  ...timestamps,
});

/** Spec 001: último estado conocido de la membresía de Patreon de cada usuario. */
export const patreonLinks = pgTable("patreon_links", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  memberId: text("member_id").unique(),
  patronStatus: text("patron_status"),
  lastChargeDate: timestamp("last_charge_date", { withTimezone: true }),
  lastChargeStatus: text("last_charge_status"),
  nextChargeDate: timestamp("next_charge_date", { withTimezone: true }),
  entitledTierIds: text("entitled_tier_ids").array().notNull().default(sql`'{}'::text[]`),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

/** Spec 001, RF-15 y RF-16: avisos recibidos de Patreon (los repetidos se ignoran). */
export const webhookEvents = pgTable("webhook_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  eventType: text("event_type").notNull(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  memberId: text("member_id"),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
});

/** Spec 009: sobres gratis con espera, racha diaria y saldo de galletas de cada usuario. */
export const userRewards = pgTable(
  "user_rewards",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    freeCharges: integer("free_charges").notNull().default(1),
    freeAnchor: timestamp("free_anchor", { withTimezone: true }).notNull().defaultNow(),
    streakDay: integer("streak_day").notNull().default(0),
    lastDailyDay: text("last_daily_day"),
    lastDailyAt: timestamp("last_daily_at", { withTimezone: true }),
    lastTimeZone: text("last_time_zone"),
    cookies: integer("cookies").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("user_rewards_cookies_non_negative", sql`${t.cookies} >= 0`)],
);

/** Spec 009, RF-18: cada movimiento de galletas; solo se insertan filas. */
export const cookieLedger = pgTable(
  "cookie_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    actorUserId: uuid("actor_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cookie_ledger_user_idx").on(t.userId, t.createdAt)],
);

/** Spec 007, RF-11: días con actividad de cada usuario (usuarios activos por día). */
export const userDays = pgTable(
  "user_days",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    day: date("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), index("user_days_day_idx").on(t.day)],
);

/** Spec 007, RF-16 y RF-17: historial de copias de seguridad. */
export const backupRuns = pgTable("backup_runs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok").notNull().default(false),
  file: text("file"),
  bytes: bigint("bytes", { mode: "number" }),
  error: text("error"),
});

/** Spec 010, RF-17: ajustes de la web que cambia el administrador (p. ej. la edad mínima). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

/** Spec 020, RF-28 y RF-29: zonas del mapa de Expediciones, con su botín fijo por duración (calificación «Bien»). */
export const expeditionZones = pgTable("expedition_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  terrain: expeditionTerrain("terrain").notNull(),
  difficulty: integer("difficulty").notNull(),
  /** 0 = abierta desde el inicio (RF-4). */
  fragmentsRequired: integer("fragments_required").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  imageKey: text("image_key"),
  active: boolean("active").notNull().default(true),
  loot: jsonb("loot").$type<ZoneLoot>().notNull(),
  ...timestamps,
});

/** Spec 020: fragmentos de mapa y expediciones completadas de cada coleccionista. */
export const expeditionProfiles = pgTable(
  "expedition_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    fragments: integer("fragments").notNull().default(0),
    completed: integer("completed").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("expedition_profiles_fragments_non_negative", sql`${t.fragments} >= 0`)],
);

/** Spec 020, RF-5: zonas con niebla que cada coleccionista ya abrió. */
export const expeditionZoneUnlocks = pgTable(
  "expedition_zone_unlocks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => expeditionZones.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.zoneId] })],
);

/** Una carta del equipo congelada al enviar (RF-17). */
export interface ExpeditionMember {
  cardId: string;
  holo: boolean;
  characterId: string | null;
  name: string;
  rarity: string;
  terrain: string | null;
  role: string | null;
  bondLevel: number;
}

/** Lo que pasó al reclamar (RF-20 a RF-24); se devuelve igual si se reclama otra vez. */
export interface ExpeditionResult {
  loot: DurationLoot;
  packWon: boolean;
  packId: string | null;
  phrases: PickedPhrase[];
  bonds: { characterId: string; xp: number; level: number; before: number }[];
}

/** Spec 020: una expedición, con su calificación y botín congelados al enviar (RF-15 a RF-24). */
export const expeditions = pgTable(
  "expeditions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    zoneId: uuid("zone_id")
      .notNull()
      .references(() => expeditionZones.id),
    zoneName: text("zone_name").notNull(),
    zoneTerrain: expeditionTerrain("zone_terrain").notNull(),
    durationMin: integer("duration_min").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    power: doublePrecision("power").notNull(),
    difficulty: integer("difficulty").notNull(),
    rating: text("rating").$type<Rating>().notNull(),
    loot: jsonb("loot").$type<DurationLoot>().notNull(),
    team: jsonb("team").$type<ExpeditionMember[]>().notNull(),
    status: expeditionStatus("status").notNull().default("active"),
    seed: text("seed"),
    result: jsonb("result").$type<ExpeditionResult>(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [index("expeditions_user_status_idx").on(t.userId, t.status)],
);

/** Spec 020, RF-8: una carta (por versión) solo puede estar en una expedición en curso, también ante peticiones a la vez. */
export const expeditionCards = pgTable(
  "expedition_cards",
  {
    expeditionId: uuid("expedition_id")
      .notNull()
      .references(() => expeditions.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    holo: boolean("holo").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.expeditionId, t.cardId, t.holo] }),
    uniqueIndex("expedition_cards_busy_uq").on(t.userId, t.cardId, t.holo).where(sql`${t.active}`),
  ],
);

/** Spec 020: vínculo de cada coleccionista con cada personaje (experiencia acumulada). */
export const characterBonds = pgTable(
  "character_bonds",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    xp: integer("xp").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.characterId] })],
);

/**
 * Spec 024, RF-14 a RF-21: cuentas de administrador con usuario, contraseña y segundo factor por Telegram. Cada una
 * tiene su usuario del juego (rol `admin`, `patreon_user_id` = `admin:<usuario>`).
 */
export const adminAccounts = pgTable("admin_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  /** La contraseña la puso el servidor (al crearla o restablecerla): hay que cambiarla al entrar. */
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  telegramChatId: text("telegram_chat_id"),
  /** Hash del enlace de vinculación con el bot (`/start <token>`) y su caducidad. */
  telegramLinkHash: text("telegram_link_hash"),
  telegramLinkExpiresAt: timestamp("telegram_link_expires_at", { withTimezone: true }),
  /** Paso de inicio de sesión en curso (contraseña ya comprobada): hash del valor de la cookie y hasta cuándo vale. */
  pendingHash: text("pending_hash"),
  pendingUntil: timestamp("pending_until", { withTimezone: true }),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  ...timestamps,
});

/** Spec 024, RF-17 y RF-18: los códigos enviados por Telegram (solo su hash), de un uso y con caducidad. */
export const adminLoginCodes = pgTable(
  "admin_login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => adminAccounts.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("admin_login_codes_account_idx").on(t.accountId, t.createdAt)],
);
