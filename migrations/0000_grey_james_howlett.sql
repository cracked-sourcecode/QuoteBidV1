CREATE TYPE "public"."signup_stage" AS ENUM('payment', 'profile', 'ready');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_username_unique" UNIQUE("username"),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "annotation_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"annotation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"document_type" text NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"position" jsonb NOT NULL,
	"color" text DEFAULT 'yellow',
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link_url" text,
	"related_id" integer,
	"related_type" text,
	"is_read" boolean DEFAULT false,
	"icon" text DEFAULT 'info',
	"icon_color" text DEFAULT 'blue',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"publication_id" integer NOT NULL,
	"title" text NOT NULL,
	"request_type" text NOT NULL,
	"media_type" text,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"tier" text,
	"industry" text,
	"tags" text[],
	"deadline" timestamp,
	"minimum_bid" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pitch_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"pitch_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"is_admin" boolean NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"is_read" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "pitches" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text,
	"audio_url" text,
	"transcript" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_draft" boolean DEFAULT false,
	"pitch_type" text DEFAULT 'text',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"payment_intent_id" text,
	"bid_amount" integer,
	"authorization_expires_at" timestamp,
	"billed_at" timestamp,
	"stripe_charge_id" text,
	"billing_error" text,
	"article_url" text,
	"article_title" text
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" serial PRIMARY KEY NOT NULL,
	"pitch_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"opportunity_id" integer NOT NULL,
	"publication_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'ready_for_billing' NOT NULL,
	"article_title" text,
	"article_url" text,
	"article_file_path" text,
	"screenshot_url" text,
	"publication_date" timestamp,
	"invoice_id" text,
	"payment_id" text,
	"payment_intent_id" text,
	"notification_sent" boolean DEFAULT false,
	"metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"charged_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text NOT NULL,
	"website" text,
	"description" text,
	"category" text,
	"tier" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"opportunity_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "signup_state" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'started',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"avatar" text,
	"bio" text,
	"location" text,
	"title" text,
	"industry" text,
	"linkedin_url" text,
	"instagram_url" text,
	"facebook_url" text,
	"twitter_url" text,
	"website_url" text,
	"other_profile_url" text,
	"do_follow_link" text,
	"past_pr_links" text,
	"profile_completed" boolean DEFAULT false,
	"is_admin" boolean DEFAULT false,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"premium_status" text DEFAULT 'free',
	"premium_expiry" timestamp,
	"signup_stage" text DEFAULT 'payment',
	"company_name" text,
	"phone_number" text,
	"subscription_status" text DEFAULT 'inactive',
	"is_paid" boolean DEFAULT false,
	"has_agreed_to_terms" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "signup_state" ADD CONSTRAINT "signup_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;