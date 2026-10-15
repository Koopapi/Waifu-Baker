CREATE TABLE "pack_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"drop_table_id" uuid NOT NULL,
	"server_seed" text NOT NULL,
	"rng_version" text NOT NULL,
	"rolls" jsonb NOT NULL,
	"card_ids" uuid[] NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_ack_at" timestamp with time zone,
	CONSTRAINT "pack_openings_pack_id_unique" UNIQUE("pack_id")
);
--> statement-breakpoint
CREATE TABLE "user_cards" (
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"first_obtained_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_obtained_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_cards_user_id_card_id_pk" PRIMARY KEY("user_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "pack_openings" ADD CONSTRAINT "pack_openings_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_openings" ADD CONSTRAINT "pack_openings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_openings" ADD CONSTRAINT "pack_openings_drop_table_id_drop_tables_id_fk" FOREIGN KEY ("drop_table_id") REFERENCES "public"."drop_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;