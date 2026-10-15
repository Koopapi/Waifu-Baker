CREATE TYPE "public"."card_status" AS ENUM('draft', 'ready');--> statement-breakpoint
CREATE TYPE "public"."card_variant" AS ENUM('normal', 'holo', 'alt');--> statement-breakpoint
CREATE TYPE "public"."pack_source" AS ENUM('tier_grant', 'manual', 'promo');--> statement-breakpoint
CREATE TYPE "public"."pack_status" AS ENUM('sealed', 'opened', 'void');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary', 'secret');--> statement-breakpoint
CREATE TYPE "public"."set_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"meta" jsonb,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"character_id" uuid,
	"name" text DEFAULT '' NOT NULL,
	"flavor_text" text DEFAULT '' NOT NULL,
	"rarity" "rarity",
	"variant" "card_variant" DEFAULT 'normal' NOT NULL,
	"base_card_id" uuid,
	"status" "card_status" DEFAULT 'draft' NOT NULL,
	"original_key" text,
	"original_sha256" text NOT NULL,
	"pending_original_key" text,
	"width" integer,
	"height" integer,
	"key_full" text,
	"key_mid" text,
	"key_thumb" text,
	"key_public" text,
	"blurhash" text,
	"adult_reviewed_by" uuid,
	"adult_reviewed_at" timestamp with time zone,
	"seed" bigint,
	"prompt_sha256" text,
	"source_job" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"identity_tags" text DEFAULT '' NOT NULL,
	"ref_image_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "drop_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"holo_chance" double precision DEFAULT 0.2 NOT NULL,
	"published_at" timestamp with time zone,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"source" "pack_source" NOT NULL,
	"grant_key" text NOT NULL,
	"status" "pack_status" DEFAULT 'sealed' NOT NULL,
	"reason" text,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_at" timestamp with time zone,
	CONSTRAINT "packs_grant_key_unique" UNIQUE("grant_key")
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_adult" boolean DEFAULT false NOT NULL,
	"status" "set_status" DEFAULT 'draft' NOT NULL,
	"pack_size" integer DEFAULT 5 NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sets_code_unique" UNIQUE("code"),
	CONSTRAINT "sets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tier_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patreon_tier_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"set_id" uuid NOT NULL,
	"packs_per_month" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"patreon_user_id" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"is_adult_declared" boolean DEFAULT false NOT NULL,
	"adult_declared_at" timestamp with time zone,
	"adult_verified_at" timestamp with time zone,
	"last_country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_patreon_user_id_unique" UNIQUE("patreon_user_id")
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_adult_reviewed_by_users_id_fk" FOREIGN KEY ("adult_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_tables" ADD CONSTRAINT "drop_tables_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_rules" ADD CONSTRAINT "tier_rules_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cards_set_number_variant_uq" ON "cards" USING btree ("set_id","number","variant");--> statement-breakpoint
CREATE UNIQUE INDEX "cards_set_sha_uq" ON "cards" USING btree ("set_id","original_sha256");--> statement-breakpoint
CREATE INDEX "cards_set_rarity_idx" ON "cards" USING btree ("set_id","rarity");--> statement-breakpoint
CREATE UNIQUE INDEX "drop_tables_set_version_uq" ON "drop_tables" USING btree ("set_id","version");--> statement-breakpoint
CREATE INDEX "packs_user_status_idx" ON "packs" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tier_rules_tier_set_uq" ON "tier_rules" USING btree ("patreon_tier_id","set_id");