# UI Integration Scope – Dynamic Pricing Feed  
_Branch: pricing-engine-v1 • Focus: **NO layout/UX changes**, just pipe data in_

## 0 · Non-Negotiables
1. **Do NOT** rename, move, or restyle existing React components.  
2. **Do NOT** alter Tailwind classes or shadcn/ui markup.  
3. **Only add** the minimal hooks/context and *small* prop updates needed to show live `current_price` + trend arrow.  
4. All new code lives under `src/hooks/` or `src/context/`. No other folders touched.

## 1 · Existing Structure (for reference)
| Component | Path | Shows price? |
|-----------|------|--------------|
| `OpportunityCard` | `src/components/opportunity-card.tsx` | ✅ (static from initial fetch) |
| `OpportunityDetail` | `src/pages/opportunity-detail.tsx` | ✅ (static) |
| `OpportunitiesPage` | `src/pages/opportunities.tsx` | wraps many `OpportunityCard`s |

## 2 · New Plumbing (add-only)
### 2.1 WebSocket hook  
File: `src/hooks/useLivePrice.ts`

* Connect to `VITE_WS_URL` (env) with `socket.io-client`.
* `on("price:update", { id, price, trend })`  
  → `queryClient.setQueryData(["opp", id], updater)`.
* Small reconnection/error console logs.

### 2.2 Hook mount  
Edit **one place only**: `src/App.tsx` (or root layout).  
```tsx
import { useLivePrice } from "@/hooks/useLivePrice";
function App() {
  useLivePrice();          // <- side-effect only
  return <RouterProvider router={router} />;
}
export default App;
```

### 2.3 Price data source
Every component that currently fetch('/api/opportunity/:id') with React-Query must keep doing so but add:

```ts
useQuery(["opp", id], fetchFn, { refetchInterval: 5000 }); // fallback
```
No other prop/logic changes.

### 2.4 Trend arrow (optional)
If component already shows price string, append:

```tsx
{data?.trend === 1 && <span className="text-green-500 ml-1">↑</span>}
{data?.trend === -1 && <span className="text-red-500 ml-1">↓</span>}
```

## 3 · Env & Dev
```ini
VITE_WS_URL=http://localhost:4000
```
Run WS server separately: `npm run ws`.

## 4 · Acceptance Criteria
☐ DevTools → Network → WS frames show `price:update`.

☐ OpportunityCard price text changes within 1 s when worker emits.

☐ No visual regressions (class names unchanged).

☐ If WS fails, polling (5 s) still keeps price fresh.

☐ Only files created/edited:
- `src/hooks/useLivePrice.ts`
- root component mount line
- minor prop addition for trend arrow.

Any other diff is rejected.

## Cursor Prompt
```
Implement everything in docs/pricing-ui-integration.md.
Follow 'Non-Negotiables'. After generation, run npm run dev and verify Dashboard prices update live. No other UI changes.
``` 