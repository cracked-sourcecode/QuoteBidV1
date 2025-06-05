# QuoteBid Dynamic-Pricing Engine – Full Scope
_Branch `pricing-engine-go-time-baby` | Last updated: 2025-01-05_

---

## 0 · Business Goal
Kill fixed PR fees.  
Every opportunity's price moves in real time so (a) users pay fair
market value, (b) we maximise pitches before the reporter's deadline,
and (c) we still capture margin.  
A lightweight TypeScript engine does the math; a GPT-4o *pricing agent*
intervenes only when human-level judgment helps (big moves, near
deadline, promotional emails).

---

## 1 · Core Variables

| Name (DB / snapshot key)        | Simple meaning | Effect on price |
|---------------------------------|----------------|-----------------|
| `tier`                          | Starting bucket – $250 / 175 / 125 | Sets opening price only |
| `current_price`                 | What users see now                | Baseline every tick |
| `pitches`                       | # submitted silent bids           | ↑ demand ⇒ price ↑ |
| `clicks`                        | # times users open the card       | Early interest, smaller weight |
| `saves`                         | # "save for later" clicks         | Same as clicks, lower weight |
| `drafts`                        | Started but unsent pitches        | Latent demand |
| `deadline` → `hoursRemaining`   | Time left before reporter locks   | Urgency → price ↓ near end |
| `outlet_avg_price`              | Historical avg for that outlet    | Anchor: pull price toward mean |
| `successRateOutlet`             | Past win-rate (0–1)               | Low success ⇒ discount |
| `inventory_level`               | How many similar opps still open  | Scarcity premium |
| `category` & `elasticity`       | Topic + sensitivity factor        | Multiplier on demand score |
| `priceStep` _(config)_          | $ step each move (default 5)     | Smooth jumps |
| `tickIntervalMs` _(config)_     | Engine cadence (default 60 000)   | How "live" the market feels |

---

## 2 · Database Migration (`20240606_pricing_engine.sql`)
```sql
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS current_price        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS inventory_level      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category             TEXT,
  ADD COLUMN IF NOT EXISTS variable_snapshot    JSONB;

ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS outlet_avg_price     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS success_rate_outlet  NUMERIC(5,4);

CREATE TABLE IF NOT EXISTS variable_registry (
  var_name     TEXT PRIMARY KEY,
  weight       NUMERIC,
  nonlinear_fn TEXT,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_config (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  suggested_price  NUMERIC(10,2),
  snapshot_payload JSONB,
  tick_time        TIMESTAMPTZ DEFAULT now()
);
```

---

## 3 · Architecture Flow
```bash
Variable streams ─┐
                  │           ┌──────── pricingEngine.ts ───────┐
(DB & API) ─────► │ snapshot  │  pure math → PriceSnapshot event │
                  │           └──────────────┬───────────────────┘
                  ▼                          ▼
            Gatekeeper + Batcher      (skip or) batch ≤50 → GPT-4o
                  │                              │
   trivial move ──┘                              │
                  ▼                              │ PriceAction JSON
        /api/opportunity/:id/price  ◄────────────┘
                  │
              Neon DB
                  │
           React UI polling
                  │
         (opt.) Notification email
```
**Gate rule**: skip GPT if |Δ| < priceStep and hoursRemaining > 12.

---

## 4 · Config & Secrets
```env
DATABASE_URL=postgresql://…  # Neon
OPENAI_API_KEY=sk-…
RESEND_API_KEY=re_…          # email; change if you pick Postmark
PRICE_STEP=5                 # dollars
TICK_INTERVAL_MS=60000       # 60 s
```

---

## 5 · Dependencies

| Layer | Package / Service | Notes |
|-------|------------------|-------|
| ORM | drizzle-orm, pg | Already in repo |
| Cron | Node script or Vercel scheduled fn | local: `pnpm tsx pricingWorker.ts` |
| LLM | OpenAI GPT-4o mini | low-cost, function-calling |
| Email | Resend (free) | 3,000 emails/mo |
| UI | @tanstack/react-query | polling 5s; socket later |

---

## 6 · First-Sprint Deliverables

1. **Database** – run migration; seed variable_registry & pricing_config.

2. **pricingEngine.ts** – deterministic function + Vitest tests.

3. **pricingWorker.ts** – every 60s:
   - query open opps → computePrice()
   - log to price_snapshots
   - apply price directly or queue for GPT.

4. **API route** `/api/opportunity/[id]/price.ts` – atomic update.

5. **UI hook** `useOpportunityPrice()` – poll & show price badge.

---

## 7 · Cost Guardrails

- Gatekeeper skips ≈ 90% of GPT calls.
- Batch ≤ 50 snapshots → prompt overhead amortised.
- JSON keys short ("hr", "pc", "cl") → saves tokens.
- Alert if daily spend ≥ $30; auto-throttle to 5-min ticks.

---

## 8 · Dev Loop
```bash
# 1. Migrate & seed
drizzle-kit push
pnpm tsx scripts/seedVariables.ts
drizzle-kit generate   # refresh types

# 2. Unit tests
pnpm vitest run

# 3. Local worker
pnpm tsx apps/worker/pricingWorker.ts

# 4. Hit localhost:3000 – prices should tick every minute
```

---

## 9 · Stretch Goals (Phase 2)

- Kafka/Redis event bus (multi-worker scaling)
- Socket.io realtime push (≤100ms latency)
- Slack / SMS channels in notifications
- Back-testing harness comparing price curve vs. actual wins
- Admin UI for variable weight tuning & A/B tests

---

## 🔄 Progress Log

| Date (UTC) | Milestone | Notes |
|------------|-----------|-------|
| 2025-06-06 | **Step 1** – DB migration & seed complete | `variable_registry`, `pricing_config`, `price_snapshots` live in Neon. |
| 2025-06-06 | **Step 2** – `pricingEngine.ts` + tests | 23 Vitest cases green; deterministic math locked. |
| 2025-06-06 | **Step 3** – Worker + Gatekeeper | Cron runs every 60 s, gate keeps ≈90 % of GPT calls, logs snapshots. |
| 2025-06-06 | **Step 4** – GPT-4o integration & price API | Live AI pricing decisions; Resend email hook operational. |
| 2025-06-06 | **Step 5** – WebSocket real-time UI | Socket.io server on :4000, React price badges flash in <1 s. |

### 🔜 NEXT STEP (6)

1. **Admin Dashboard**  
   * Route: `/admin/pricing` (guarded)  
   * Editable table for `variable_registry` weights  
   * Sliders for `priceStep` and `tickIntervalMs`  
   * Realtime GPT-latency sparkline (pull `/api/admin/metrics`)

2. **Then Web-Push notifications** (browser only, no native iOS).

*Cursor prompt for Step 6 lives in the main spec above.*  
_Add new progress rows as each milestone ships._ 