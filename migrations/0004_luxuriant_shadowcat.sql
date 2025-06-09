CREATE TABLE "media_coverage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"publication" text,
	"url" text NOT NULL,
	"article_date" timestamp,
	"source" text DEFAULT 'manual',
	"pitch_id" integer,
	"placement_id" integer,
	"is_verified" boolean DEFAULT false,
	"screenshot" text,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "meta" jsonb;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "last_drift_at" bigint;--> statement-breakpoint
ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_pitch_id_pitches_id_fk" FOREIGN KEY ("pitch_id") REFERENCES "public"."pitches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id") ON DELETE set null ON UPDATE no action;