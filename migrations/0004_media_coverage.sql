-- Migration to add media_coverage table
CREATE TABLE IF NOT EXISTS "media_coverage" (
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

-- Add foreign key constraints
ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_pitch_id_pitches_id_fk" FOREIGN KEY ("pitch_id") REFERENCES "pitches"("id") ON DELETE SET NULL;
ALTER TABLE "media_coverage" ADD CONSTRAINT "media_coverage_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "placements"("id") ON DELETE SET NULL; 