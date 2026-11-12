ALTER TABLE "cards" ADD COLUMN "key_holo_mid" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "key_holo_thumb" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "key_holo_public" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "flat_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "flat_error" text;