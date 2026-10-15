import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
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

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const setStatus = pgEnum("set_status", ["draft", "published", "archived"]);
export const rarity = pgEnum("rarity", ["common", "uncommon", "rare", "epic", "legendary", "secret"]);
export const cardVariant = pgEnum("card_variant", ["normal", "holo", "alt"]);
export const cardStatus = pgEnum("card_status", ["draft", "ready"]);
export const packSource = pgEnum("pack_source", ["tier_grant", "manual", "promo"]);
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
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const characters = pgTable("characters", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio").notNull().default(""),
  identityTags: text("identity_tags").notNull().default(""),
  refImageId: text("ref_image_id"),
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
  ...timestamps,
});

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
    ...timestamps,
  },
  (t) => [
    uniqueIndex("cards_set_number_variant_uq").on(t.setId, t.number, t.variant),
    uniqueIndex("cards_set_sha_uq").on(t.setId, t.originalSha256),
    index("cards_set_rarity_idx").on(t.setId, t.rarity),
  ],
);

export const dropTables = pgTable(
  "drop_tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    /** Una entrada por ranura del sobre: pesos por rareza. */
    slots: jsonb("slots").$type<Record<string, number>[]>().notNull().default(sql`'[]'::jsonb`),
    holoChance: doublePrecision("holo_chance").notNull().default(0.2),
    /** Protección de mala suerte: N sobres; 0 la desactiva (spec 004, RF-12). */
    pityThreshold: integer("pity_threshold").notNull().default(10),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isPublic: boolean("is_public").notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("drop_tables_set_version_uq").on(t.setId, t.version)],
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
    grantKey: text("grant_key").notNull().unique(),
    status: packStatus("status").notNull().default("sealed"),
    reason: text("reason"),
    grantedBy: uuid("granted_by").references(() => users.id),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    openedAt: timestamp("opened_at", { withTimezone: true }),
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
