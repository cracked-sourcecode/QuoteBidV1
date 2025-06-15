-- Update user preferences default to dark theme for new users
ALTER TABLE users ALTER COLUMN user_preferences SET DEFAULT '{
  "theme": "dark",
  "notifications": true,
  "language": "en"
}'::jsonb; 