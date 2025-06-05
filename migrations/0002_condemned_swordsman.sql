CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" integer NOT NULL,
	"suggested_price" numeric(10, 2),
	"snapshot_payload" jsonb,
	"tick_time" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variable_registry" (
	"var_name" text PRIMARY KEY NOT NULL,
	"weight" numeric,
	"nonlinear_fn" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "current_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "inventory_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "variable_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "pitches" ADD COLUMN "successful_at" timestamp;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "outlet_avg_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "success_rate_outlet" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" DROP COLUMN "preview_text";