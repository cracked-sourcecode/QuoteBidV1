-- Script to update placement payment intent IDs from their associated pitches

-- Update placements by copying payment intent IDs from corresponding pitches
UPDATE placements
SET payment_intent_id = pitches.payment_intent_id
FROM pitches
WHERE placements.pitch_id = pitches.id
AND placements.payment_intent_id IS NULL
AND pitches.payment_intent_id IS NOT NULL;