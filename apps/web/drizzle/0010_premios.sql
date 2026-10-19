ALTER TABLE "packs" ADD COLUMN "celebrated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "packs_seen_at" timestamp with time zone;