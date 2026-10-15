CREATE TABLE "pity_counters" (
	"user_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"packs_since_epic" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pity_counters_user_id_set_id_pk" PRIMARY KEY("user_id","set_id")
);
--> statement-breakpoint
ALTER TABLE "user_cards" DROP CONSTRAINT "user_cards_user_id_card_id_pk";--> statement-breakpoint
ALTER TABLE "user_cards" ADD COLUMN "holo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_user_id_card_id_holo_pk" PRIMARY KEY("user_id","card_id","holo");--> statement-breakpoint
ALTER TABLE "drop_tables" ADD COLUMN "pity_threshold" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "pack_openings" ADD COLUMN "pity_applied" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pity_counters" ADD CONSTRAINT "pity_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pity_counters" ADD CONSTRAINT "pity_counters_set_id_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."sets"("id") ON DELETE cascade ON UPDATE no action;