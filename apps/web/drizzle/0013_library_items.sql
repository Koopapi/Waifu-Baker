CREATE TYPE "public"."library_kind" AS ENUM('fondo', 'sello', 'adorno', 'particulas');--> statement-breakpoint
CREATE TABLE "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "library_kind" NOT NULL,
	"name" text NOT NULL,
	"key" text,
	"sha256" text,
	"particles" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "library_items_sha_uq" ON "library_items" USING btree ("sha256") WHERE "library_items"."sha256" is not null;--> statement-breakpoint
-- Spec 017 (ampliación): los fondos de cada colección pasan a la biblioteca general, con su misma clave (una sola vez
-- por huella, el más antiguo).
INSERT INTO "library_items" ("kind", "name", "key", "sha256", "created_at")
SELECT DISTINCT ON ("sha256") 'fondo', "name", "key", "sha256", "created_at" FROM "set_backgrounds" ORDER BY "sha256", "created_at";
