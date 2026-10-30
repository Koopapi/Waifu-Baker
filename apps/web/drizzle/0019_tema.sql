ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'kawaii' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_theme_check" CHECK ("users"."theme" in ('kawaii', 'street'));