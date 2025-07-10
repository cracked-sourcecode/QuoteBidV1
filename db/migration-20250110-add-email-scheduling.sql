-- Migration: Add email scheduling columns to opportunities table
-- This fixes the issue where opportunity alert emails are lost on server restart

ALTER TABLE opportunities 
ADD COLUMN email_scheduled_at TIMESTAMP,
ADD COLUMN email_sent_at TIMESTAMP,
ADD COLUMN email_send_attempted BOOLEAN DEFAULT FALSE;

-- Index for efficient querying of pending emails
CREATE INDEX idx_opportunities_email_scheduling 
ON opportunities(email_scheduled_at, email_sent_at, email_send_attempted) 
WHERE email_scheduled_at IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN opportunities.email_scheduled_at IS 'When the opportunity alert email should be sent (7 minutes after creation)';
COMMENT ON COLUMN opportunities.email_sent_at IS 'When the opportunity alert email was actually sent';
COMMENT ON COLUMN opportunities.email_send_attempted IS 'Whether we have attempted to send the email (to prevent retries)'; 