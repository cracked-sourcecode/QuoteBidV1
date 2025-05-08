-- Create the signup_stage enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signup_stage') THEN
        CREATE TYPE signup_stage AS ENUM ('agreement', 'payment', 'profile', 'ready');
    END IF;
END
$$;

-- Add new signup columns to the users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS signup_stage signup_stage DEFAULT 'agreement',
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- Populate the signup_stage field based on existing user data
UPDATE users 
SET signup_stage = 
    CASE 
        WHEN profile_completed = true THEN 'ready'::signup_stage
        WHEN agreement_pdf_url IS NOT NULL AND profile_completed = false THEN 'payment'::signup_stage
        ELSE 'agreement'::signup_stage
    END;