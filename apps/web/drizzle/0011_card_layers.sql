ALTER TABLE "cards" ADD COLUMN "layers" jsonb;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "layers_pending" jsonb;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "pending_keys" jsonb;