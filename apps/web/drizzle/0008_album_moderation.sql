CREATE TYPE "public"."album_moderation" AS ENUM('none', 'hidden', 'review_requested', 'review_rejected');--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "moderation" "album_moderation" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "hidden_note" text;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "hidden_by" uuid;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "review_alias" text;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "review_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Spec 012: los álbumes ya existentes toman su fecha de creación como primera activación.
UPDATE "albums" SET "activated_at" = "created_at" WHERE "is_public" = true AND "activated_at" IS NULL;
