-- Add rubicon_user_id column to users table for SSO integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS rubicon_user_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_rubicon_user_id ON users(rubicon_user_id);

-- Add comment
COMMENT ON COLUMN users.rubicon_user_id IS 'Reference to Rubicon user ID for SSO integration';