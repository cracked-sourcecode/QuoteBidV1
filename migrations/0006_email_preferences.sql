-- Add email preferences column to users table
ALTER TABLE users ADD COLUMN email_preferences JSONB DEFAULT '{
  "priceAlerts": true,
  "opportunityNotifications": true,
  "pitchStatusUpdates": true,
  "paymentConfirmations": true,
  "mediaCoverageUpdates": true,
  "placementSuccess": true
}'::jsonb; 