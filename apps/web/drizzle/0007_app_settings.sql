CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "age_confirmed_min" integer;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Spec 010, RF-18: las cuentas que ya confirmaron la edad lo hicieron con la mínima de entonces, 16.
UPDATE "users" SET "age_confirmed_min" = 16 WHERE "age_confirmed_at" IS NOT NULL;
