-- 20240606_pricing_engine.sql

-- ── Opportunities extras ──────────────────────────────────────────
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS current_price        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS inventory_level      INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category             TEXT,
  ADD COLUMN IF NOT EXISTS variable_snapshot    JSONB;

-- ── Publications extras ──────────────────────────────────────────
ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS outlet_avg_price     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS success_rate_outlet  NUMERIC(5,4);

-- ── Variable weights (hot-pluggable) ────────────────────────────
CREATE TABLE IF NOT EXISTS variable_registry (
  var_name     TEXT PRIMARY KEY,
  weight       NUMERIC,
  nonlinear_fn TEXT,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Global price knobs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_config (
  key         TEXT PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Tick audit log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id    UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  suggested_price   NUMERIC(10,2),
  snapshot_payload  JSONB,
  tick_time         TIMESTAMPTZ DEFAULT now()
); 