ALTER TABLE "drop_tables" ADD COLUMN "ex_pity_threshold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pity_counters" ADD COLUMN "packs_since_ex" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Spec 028, RF-4 y RF-6: sin grosor guardado, la carta pasa a verse con 3,0. Para que ninguna carta ya guardada cambie,
-- las que no tienen grosor reciben el de su marco con el que se veían (MARCOS de carta-capas.js; personalizado 2,2).
-- «Sin marco» no usa borde. Idempotente: solo toca las que no tienen `borde`.
UPDATE "cards" SET "layers" = "layers" || jsonb_build_object('borde', CASE "layers"->>'marco' WHEN 'n' THEN 1.9 WHEN 'r' THEN 2.9 WHEN 'sr' THEN 3.3 WHEN 'ssr' THEN 4.3 WHEN 'ur' THEN 4.8 WHEN 'personalizado' THEN 2.2 END)
WHERE "layers" IS NOT NULL AND jsonb_typeof("layers") = 'object' AND NOT ("layers" ? 'borde') AND "layers"->>'marco' IN ('n', 'r', 'sr', 'ssr', 'ur', 'personalizado');--> statement-breakpoint
UPDATE "cards" SET "layers_pending" = "layers_pending" || jsonb_build_object('borde', CASE "layers_pending"->>'marco' WHEN 'n' THEN 1.9 WHEN 'r' THEN 2.9 WHEN 'sr' THEN 3.3 WHEN 'ssr' THEN 4.3 WHEN 'ur' THEN 4.8 WHEN 'personalizado' THEN 2.2 END)
WHERE "layers_pending" IS NOT NULL AND jsonb_typeof("layers_pending") = 'object' AND NOT ("layers_pending" ? 'borde') AND "layers_pending"->>'marco' IN ('n', 'r', 'sr', 'ssr', 'ur', 'personalizado');--> statement-breakpoint
UPDATE "card_versions" SET "layers" = "layers" || jsonb_build_object('borde', CASE "layers"->>'marco' WHEN 'n' THEN 1.9 WHEN 'r' THEN 2.9 WHEN 'sr' THEN 3.3 WHEN 'ssr' THEN 4.3 WHEN 'ur' THEN 4.8 WHEN 'personalizado' THEN 2.2 END)
WHERE "layers" IS NOT NULL AND jsonb_typeof("layers") = 'object' AND NOT ("layers" ? 'borde') AND "layers"->>'marco' IN ('n', 'r', 'sr', 'ssr', 'ur', 'personalizado');
