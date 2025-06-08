# 📈  Price-Trend Chart Migration  
> **Scope:** Swap Recharts for TradingView Lightweight-Charts only in `OpportunityDetail.tsx`  
> **Branch:** `feature/price-trend-tv` → merge into `opus-max`

---

## 🔒 Allowed-Files Matrix

| Path | What you may do |
|------|-----------------|
| `package.json` & lockfile | **add** `lightweight-charts@^4`, nothing else |
| `src/components/PriceTrendChart.tsx` | **NEW** – the wrapper component (see §3) |
| `src/pages/OpportunityDetail.tsx` | delete Recharts code & imports, add `<PriceTrendChart>` |
| `docs/price-trend-chart-migration.md` | keep this doc in sync |
| _Everything else_ | **MUST remain untouched** |

---

## 1 · Install lib
```bash
pnpm add lightweight-charts |.   (Then await further instruction)
``` 