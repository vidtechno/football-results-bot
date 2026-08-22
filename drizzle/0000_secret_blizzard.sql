CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" bigint NOT NULL,
	"username" varchar(255),
	"first_name" varchar(255),
	"last_name" varchar(255),
	"language_code" varchar(10) DEFAULT 'uz',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"country" varchar(100) NOT NULL,
	"logo_url" varchar(500),
	"type" varchar(20) DEFAULT 'league' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "competitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"country" varchar(100),
	"logo_url" varchar(500),
	"venue_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" integer NOT NULL,
	"competition_id" integer NOT NULL,
	"season" integer NOT NULL,
	"round" varchar(100),
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'NS' NOT NULL,
	"status_short" varchar(10) DEFAULT 'NS' NOT NULL,
	"kickoff_at" timestamp with time zone NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"half_time_home_score" integer,
	"half_time_away_score" integer,
	"full_time_home_score" integer,
	"full_time_away_score" integer,
	"venue" varchar(255),
	"referee" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "favorite_competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"competition_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"fixture_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"fixture_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"match_start" boolean DEFAULT true NOT NULL,
	"match_goals" boolean DEFAULT true NOT NULL,
	"match_final_result" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "api_sync_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'IDLE' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"next_sync_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"error_message" varchar(1000),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_sync_state_sync_type_unique" UNIQUE("sync_type")
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_competitions" ADD CONSTRAINT "favorite_competitions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_competitions" ADD CONSTRAINT "favorite_competitions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_subscriptions" ADD CONSTRAINT "match_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_subscriptions" ADD CONSTRAINT "match_subscriptions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_event_id_notification_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."notification_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fixtures_kickoff" ON "fixtures" USING btree ("kickoff_at");--> statement-breakpoint
CREATE INDEX "idx_fixtures_competition" ON "fixtures" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "idx_fixtures_status" ON "fixtures" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_favorite_competitions_user_comp" ON "favorite_competitions" USING btree ("user_id","competition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_favorite_teams_user_team" ON "favorite_teams" USING btree ("user_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_match_subs_user_fixture" ON "match_subscriptions" USING btree ("user_id","fixture_id");--> statement-breakpoint
CREATE INDEX "idx_deliveries_status" ON "notification_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deliveries_user" ON "notification_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_events_processed" ON "notification_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_notification_events_fixture" ON "notification_events" USING btree ("fixture_id");