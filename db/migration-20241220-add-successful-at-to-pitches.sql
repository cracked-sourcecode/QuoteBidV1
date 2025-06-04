-- Migration to add successfulAt column to pitches table
-- This will track when a pitch status was changed to successful

ALTER TABLE pitches ADD COLUMN successful_at TIMESTAMP;

-- Update existing successful pitches to have their successfulAt set to updatedAt
UPDATE pitches 
SET successful_at = updated_at 
WHERE status = 'successful' OR status = 'Successful Coverage';

-- Add an index for performance when sorting by successfulAt
CREATE INDEX idx_pitches_successful_at ON pitches(successful_at) WHERE successful_at IS NOT NULL; 