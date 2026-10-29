CREATE TYPE "public"."expedition_role" AS ENUM('gatherer', 'cartographer', 'treasure_hunter');--> statement-breakpoint
CREATE TYPE "public"."expedition_status" AS ENUM('active', 'claimed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."expedition_terrain" AS ENUM('city', 'forest', 'coast', 'ruins', 'mountain');--> statement-breakpoint
ALTER TYPE "public"."pack_source" ADD VALUE 'expedition';--> statement-breakpoint
CREATE TABLE "character_bonds" (
	"user_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_bonds_user_id_character_id_pk" PRIMARY KEY("user_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "expedition_cards" (
	"expedition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"holo" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "expedition_cards_expedition_id_card_id_holo_pk" PRIMARY KEY("expedition_id","card_id","holo")
);
--> statement-breakpoint
CREATE TABLE "expedition_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"fragments" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expedition_profiles_fragments_non_negative" CHECK ("expedition_profiles"."fragments" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expedition_zone_unlocks" (
	"user_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expedition_zone_unlocks_user_id_zone_id_pk" PRIMARY KEY("user_id","zone_id")
);
--> statement-breakpoint
CREATE TABLE "expedition_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"terrain" "expedition_terrain" NOT NULL,
	"difficulty" integer NOT NULL,
	"fragments_required" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"image_key" text,
	"active" boolean DEFAULT true NOT NULL,
	"loot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expeditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"zone_name" text NOT NULL,
	"zone_terrain" "expedition_terrain" NOT NULL,
	"duration_min" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"power" double precision NOT NULL,
	"difficulty" integer NOT NULL,
	"rating" text NOT NULL,
	"loot" jsonb NOT NULL,
	"team" jsonb NOT NULL,
	"status" "expedition_status" DEFAULT 'active' NOT NULL,
	"seed" text,
	"result" jsonb,
	"claimed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "terrain" "expedition_terrain";--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "role" "expedition_role";--> statement-breakpoint
ALTER TABLE "character_bonds" ADD CONSTRAINT "character_bonds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_bonds" ADD CONSTRAINT "character_bonds_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_cards" ADD CONSTRAINT "expedition_cards_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_cards" ADD CONSTRAINT "expedition_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_cards" ADD CONSTRAINT "expedition_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_profiles" ADD CONSTRAINT "expedition_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_zone_unlocks" ADD CONSTRAINT "expedition_zone_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_zone_unlocks" ADD CONSTRAINT "expedition_zone_unlocks_zone_id_expedition_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."expedition_zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_zone_id_expedition_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."expedition_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_cards_busy_uq" ON "expedition_cards" USING btree ("user_id","card_id","holo") WHERE "expedition_cards"."active";--> statement-breakpoint
CREATE INDEX "expeditions_user_status_idx" ON "expeditions" USING btree ("user_id","status");