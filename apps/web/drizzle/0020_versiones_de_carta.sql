CREATE TABLE "card_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"ficha" jsonb NOT NULL,
	"layers" jsonb,
	"changed" text NOT NULL,
	"pending" boolean DEFAULT false NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_versions_changed_check" CHECK ("card_versions"."changed" in ('ficha', 'capas', 'ambas'))
);
--> statement-breakpoint
ALTER TABLE "card_versions" ADD CONSTRAINT "card_versions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_versions" ADD CONSTRAINT "card_versions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_versions_card_number_uq" ON "card_versions" USING btree ("card_id","number");--> statement-breakpoint
-- Spec 027, RF-25: lo guardado de cada carta existente pasa a ser su versión 1 (su ficha y sus capas vigentes).
INSERT INTO "card_versions" ("card_id", "number", "ficha", "layers", "changed", "pending", "actor_user_id", "created_at")
SELECT "id", 1,
  jsonb_build_object('name', "name", 'flavorText', "flavor_text", 'characterId', "character_id", 'rarity', "rarity", 'variant', "variant"),
  "layers", 'ambas', false, NULL, "updated_at"
FROM "cards";
