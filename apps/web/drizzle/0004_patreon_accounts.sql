CREATE TABLE "patreon_links" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"member_id" text,
	"patron_status" text,
	"last_charge_date" timestamp with time zone,
	"last_charge_status" text,
	"next_charge_date" timestamp with time zone,
	"entitled_tier_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patreon_links_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"member_id" text,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "webhook_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "packs" ADD COLUMN "cycle_key" text;--> statement-breakpoint
ALTER TABLE "sets" ADD COLUMN "is_welcome" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "purged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patreon_links" ADD CONSTRAINT "patreon_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sets_single_welcome_uq" ON "sets" USING btree ("is_welcome") WHERE "sets"."is_welcome";