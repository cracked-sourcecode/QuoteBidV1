ALTER TABLE opportunities
  ADD COLUMN last_price_update TIMESTAMP DEFAULT NOW(); 