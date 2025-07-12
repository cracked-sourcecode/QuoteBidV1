-- Email Scheduling Improvements Migration
-- Adds defaults and performance index for email scheduling system

-- Add default values for email scheduling columns
ALTER TABLE opportunities 
  ALTER COLUMN email_scheduled_at SET DEFAULT NULL,
  ALTER COLUMN email_sent_at SET DEFAULT NULL,
  ALTER COLUMN email_send_attempted SET DEFAULT FALSE;

-- Create performance index for email scheduling queries
-- This speeds up the query that looks for pending emails to send
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunity_email_due
  ON opportunities (email_scheduled_at)
  WHERE email_sent_at IS NULL;

-- Create index for the fail-safe query (opportunities never scheduled)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunity_email_never_scheduled
  ON opportunities (created_at)
  WHERE email_scheduled_at IS NULL AND email_sent_at IS NULL; 