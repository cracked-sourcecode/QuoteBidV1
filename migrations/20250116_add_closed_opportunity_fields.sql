-- Add closed opportunity tracking fields
ALTER TABLE opportunities 
ADD COLUMN closed_at TIMESTAMP,
ADD COLUMN last_price NUMERIC(10,2);

-- Add index for status-based queries for better performance
CREATE INDEX idx_opportunities_status ON opportunities(status);

-- Add index for closed_at for efficient sorting
CREATE INDEX idx_opportunities_closed_at ON opportunities(closed_at) WHERE closed_at IS NOT NULL;

-- Update any existing opportunities that are past deadline to closed status
UPDATE opportunities 
SET status = 'closed', closed_at = deadline, last_price = current_price 
WHERE deadline < NOW() AND status = 'open'; 