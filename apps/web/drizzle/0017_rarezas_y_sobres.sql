-- Spec 022: cinco rarezas (poco común → común, secreta → EX) y sobres plata y gold, con una tabla de probabilidades
-- por tipo. Escrita a mano: Postgres no permite quitar valores de un enum, así que se recrea el tipo.
CREATE TYPE "public"."pack_kind" AS ENUM('silver', 'gold');--> statement-breakpoint
ALTER TABLE "packs" ADD COLUMN "kind" "pack_kind" DEFAULT 'silver' NOT NULL;--> statement-breakpoint
ALTER TABLE "drop_tables" ADD COLUMN "kind" "pack_kind" DEFAULT 'silver' NOT NULL;--> statement-breakpoint
DROP INDEX "drop_tables_set_version_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "drop_tables_set_kind_version_uq" ON "drop_tables" USING btree ("set_id","kind","version");--> statement-breakpoint
ALTER TYPE "public"."rarity" RENAME TO "rarity_old";--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('common', 'rare', 'epic', 'legendary', 'ex');--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "rarity" TYPE "public"."rarity" USING (
  CASE "rarity"::text WHEN 'uncommon' THEN 'common' WHEN 'secret' THEN 'ex' ELSE "rarity"::text END
)::"public"."rarity";--> statement-breakpoint
DROP TYPE "public"."rarity_old";--> statement-breakpoint
-- Ranuras: el peso de poco común se suma a común y secreta pasa a EX.
UPDATE "drop_tables" SET "slots" = (
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'common', coalesce((s->>'common')::numeric, 0) + coalesce((s->>'uncommon')::numeric, 0),
      'rare', coalesce((s->>'rare')::numeric, 0),
      'epic', coalesce((s->>'epic')::numeric, 0),
      'legendary', coalesce((s->>'legendary')::numeric, 0),
      'ex', coalesce((s->>'secret')::numeric, 0) + coalesce((s->>'ex')::numeric, 0)
    ) ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements("slots") WITH ORDINALITY AS t(s, ord)
);--> statement-breakpoint
-- Cada colección recibe su tabla gold en borrador, con la última ranura de épica o mejor.
INSERT INTO "drop_tables" ("set_id", "version", "kind", "slots", "holo_chance", "pity_threshold", "is_public")
SELECT dt."set_id", dt."version", 'gold', (
  SELECT jsonb_agg(
    CASE WHEN ord < n THEN '{"common":45,"rare":35,"epic":15,"legendary":4,"ex":1}'::jsonb
         ELSE '{"common":0,"rare":0,"epic":70,"legendary":25,"ex":5}'::jsonb END ORDER BY ord)
  FROM generate_series(1, s."pack_size") AS ord, (SELECT s."pack_size" AS n) AS c
), dt."holo_chance", 0, false
FROM "drop_tables" dt JOIN "sets" s ON s."id" = dt."set_id"
WHERE dt."kind" = 'silver' AND dt."version" = (SELECT max(d2."version") FROM "drop_tables" d2 WHERE d2."set_id" = dt."set_id" AND d2."kind" = 'silver');
