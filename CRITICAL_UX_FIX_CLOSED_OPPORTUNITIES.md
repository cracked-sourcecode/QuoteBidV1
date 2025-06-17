# Critical UX Fix — Closed Opportunity Handling

I am a vibe coder and we are doing final checks. We have a critical UX issue blocking launch. The app is nearly finished, and we're regarded as prodigies in this space—this feature must be corrected so we can ship to production.

## Problem Statement

When an opportunity is closed the following bugs occur:

**Vanishing rows** – The record disappears from the Opportunity Manager list when it should remain visible for reference and audit.

**Run‑away pricing engine** – Price keeps updating even after closure. Once status is CLOSED the pricing engine must freeze at the final price.

**Missing closed‑state UI** – The detail page lacks messaging that the opportunity is closed yet still accepts pitches at the frozen price.

These issues break user trust and block release.

## Solution Overview

We will address the problem with three scoped tickets and strict guardrails to avoid regressions.

### 🔴 Ticket 1 — Keep CLOSED opportunities visible

- Backend: adjust list query to include status IN (OPEN, CLOSED)
- DB: add status (enum), closedAt, and lastPrice fields if missing.
- Frontend: show a gray "Closed" badge, sort CLOSED items below OPEN.

### 🔴 Ticket 2 — Freeze pricing engine on close

- Update close‑mutation to set status=CLOSED, closedAt, lastPrice=currentPrice.
- Pricing cron/worker exits early if status !== OPEN.
- Do not write price_snapshots after closure.

### 🔴 Ticket 3 — Closed‑state UI on detail page

- Inject an `<Alert variant="warning">` banner:
  - Headline: "Closed Opportunity"
  - Body: "We're no longer adjusting price, but you can still submit a pitch at the final price $."
- Disable bid button only if user already pitched; otherwise keep it enabled at frozen amount.

## Guardrails & Non‑Regression Requirements

- **No markup regressions**: Do not introduce unmatched `<div>`/JSX elements or alter unrelated components.
- **Backend stability**: Avoid global refactors; touch only the files listed in each ticket.
- **Isolation**: Separate PR per ticket; CI must pass before merge.
- **E2E suite**: Run `yarn test:e2e` – all tests must remain green.

Any deviation causing build‑time or runtime failure blocks the release.

## Acceptance Criteria

- ✅ CLOSED opportunities remain visible with correct badge.
- ✅ Pricing engine stops generating snapshots and modifying price after closure.
- ✅ Detail page displays the closed banner and permits pitching at lastPrice.
- ✅ No regressions in OPEN/EXPIRED flows; full test suite passes. 