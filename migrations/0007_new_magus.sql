DROP TABLE "push_subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "last_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_preferences" jsonb DEFAULT '{"priceAlerts":true,"opportunityNotifications":true,"pitchStatusUpdates":true,"paymentConfirmations":true,"mediaCoverageUpdates":true,"placementSuccess":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_preferences" jsonb DEFAULT '{"theme":"dark","notifications":true,"language":"en"}'::jsonb;