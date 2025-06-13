-- Add user preferences column to users table
ALTER TABLE users ADD COLUMN user_preferences JSONB DEFAULT '{
  "theme": "light",
  "notifications": true,
  "language": "en"
}'::jsonb; 