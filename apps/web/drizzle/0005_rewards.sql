ALTER TYPE "public"."pack_source" ADD VALUE 'free';--> statement-breakpoint
ALTER TYPE "public"."pack_source" ADD VALUE 'daily';--> statement-breakpoint
CREATE TABLE "cookie_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"free_charges" integer DEFAULT 1 NOT NULL,
	"free_anchor" timestamp with time zone DEFAULT now() NOT NULL,
	"streak_day" integer DEFAULT 0 NOT NULL,
	"last_daily_day" text,
	"last_daily_at" timestamp with time zone,
	"last_time_zone" text,
	"cookies" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_rewards_cookies_non_negative" CHECK ("user_rewards"."cookies" >= 0)
);
--> statement-breakpoint
ALTER TABLE "cookie_ledger" ADD CONSTRAINT "cookie_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cookie_ledger_user_idx" ON "cookie_ledger" USING btree ("user_id","created_at");