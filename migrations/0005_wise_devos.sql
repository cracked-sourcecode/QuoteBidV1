CREATE TABLE "email_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"clicked_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_clicks" ADD CONSTRAINT "email_clicks_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;