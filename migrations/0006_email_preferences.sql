-- Add email preferences column to users table
ALTER TABLE users ADD COLUMN email_preferences JSONB DEFAULT '{
  "welcomeEmail": true,
  "passwordReset": true
}'::jsonb; 