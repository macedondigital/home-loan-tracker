# Home by October: Dashboard Improvements (V2)

## Project context

This is an improvement pass on an existing, working production dashboard. The original 7 phase build is complete and live at `home-loan-tracker.pages.dev`. This CLAUDE.md replaces the original and reflects the actual codebase state plus the new improvement scope.

## What this app does

Single user accountability dashboard for a home loan application targeting October 2026 settlement via the Family Home Guarantee single parent stream (2% deposit, $0 LMI). The user uploads weekly Bank Australia CSV statements, manually enters two bank balances, and the app scores spending against targets, tracks milestone completion, and rates broker readiness.

## Tech stack (actual, not spec)

- **Framework**: Astro 5 with React islands (`client:load`)
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (SQLite). Binding name: `DB`
- **Styling**: Inline React `style={{}}` objects. No Tailwind, no CSS modules.
- **Charts**: Inline SVG rendered in React (no external charting library)
- **Auth**: HMAC signed cookie (`hbo-session`) via `src/middleware.ts` and `src/lib/auth.ts`
- **Deployment**: `npm run build && wrangler pages deploy dist/`
- **Migrations**: Sequential SQL files in `migrations/`. Run with `wrangler d1 migrations apply home-loan-tracker --local` and `--remote`

## Key file locations

```
src/
  components/
    Dashboard.tsx        (810 lines) Main overview page
    SpendingAnalysis.tsx (623 lines) Spending tab
    Timeline.tsx         (161 lines) Timeline tab
    BrokerReady.tsx      (204 lines) Broker readiness tab
    Scenarios.tsx        Scenarios tab root (owns state + localStorage)
    SharedInputs.tsx     Scenarios: income/cash/loan input cards
    ScenarioGrid.tsx     Scenarios: 3-up responsive grid
    PropertyScenario.tsx Scenarios: single scenario card
    RevenueForecast.tsx  Scenarios: Jul-Oct revenue forecast + outgoings
    ExpenseAccordion.tsx Scenarios: incurred + prepayable expense accordion
    Compare.tsx          Offset vs Super tab (30-year projection + SVG chart)
    RangeInput.tsx       Scenarios/Compare: reusable number-box + slider
    scenario-icons.tsx   Scenarios: inline SVG icon set
    ErrorBoundary.tsx    (61 lines)  React error boundary
  pages/
    index.astro          Overview (wraps Dashboard)
    spending.astro       Spending (wraps SpendingAnalysis)
    timeline.astro       Timeline (wraps Timeline)
    broker.astro         Broker Ready (wraps BrokerReady)
    scenarios.astro      Scenarios (wraps Scenarios)
    compare.astro        Offset vs Super (wraps Compare)
    login.astro          Password gate
    404.astro            Not found
    api/                 20 route files (see table below)
  layouts/
    Layout.astro         Shared nav, header, mobile bottom tabs (6 tabs)
  lib/
    db.ts                getDB() helper
    auth.ts              Cookie signing, validation, password check
    csv-parser.ts        Bank Australia CSV parser
    categories.ts        Categorisation engine (228 lines)
    tax.ts               Scenarios: FY25-26 tax, Medicare, Div 293 (tested)
    stamp-duty.ts        Scenarios: VIC standard duty, no FHB concession (tested)
    loan.ts              Scenarios: monthly repayment (tested)
    scenario.ts          Scenarios: calculate() engine + defaults (tested)
    projection.ts        Compare: offset-vs-super + super-now-vs-home-first projections (tested)
    format.ts            Scenarios/Compare: shared AUD currency formatting
  data/
    expenses.ts          Scenarios: incurred + prepayable expense data (from P&L)
  middleware.ts          Auth check on all routes
migrations/
  0001_init.sql          Core tables
  0002_seed.sql          Milestones and documents seed data
  0003_merchant_rules.sql  Merchant rules table
  0004_recurring_expenses.sql  Recurring expenses table and seed
wrangler.toml            D1 binding config
assets/                  Personal financial reference docs (gitignored)
```

The Scenarios tab is a client-only scenario planner (no API/D1 yet). Pure
financial logic lives in `src/lib/*.ts` with vitest coverage (`npm run test`).
State persists to localStorage under key `hbo-scenarios-v1` (shared inputs,
scenarios, the editable prepayable list, and the "surplus in offset" toggle). Cash to settlement is a Jul-Oct
revenue forecast netted by monthly outgoings (not a flat figure). A bucket
distribution reduces cash available for the deposit (parked for a later year).
The accordion's incurred figures are static P&L data in `src/data/expenses.ts`;
its prepayable list seeds from there but is user-editable. See the Scenarios
section of PLAN.md for the phased build and deferred work.

## API routes

| Route | Methods | Purpose |
|---|---|---|
| api/auth/login.ts | POST | Password validation, set session cookie |
| api/auth/logout.ts | POST | Clear session cookie |
| api/health.ts | GET | DB connectivity check |
| api/months.ts | GET | List months with transaction data |
| api/upload.ts | POST | CSV parse, categorise, deduplicate, insert |
| api/summary.ts | GET | Category totals, projections, targets for ?month= |
| api/readiness.ts | GET | Broker readiness 10 point score computation |
| api/transactions/index.ts | GET | Transactions for ?month= |
| api/transactions/[id].ts | PATCH | Category override for single transaction |
| api/balances/index.ts | GET, POST | Latest balance snapshot / save new snapshot |
| api/balances/history.ts | GET | All balance snapshots for charting |
| api/milestones/index.ts | GET | All milestones with completion state |
| api/milestones/[id].ts | PATCH | Toggle milestone completion |
| api/documents/index.ts | GET | Document checklist states |
| api/documents/[id].ts | PATCH | Toggle document checked state |
| api/uploads/index.ts | GET | Upload history |
| api/uploads/latest.ts | GET | Most recent upload |
| api/recurring-expenses/index.ts | GET, POST | Recurring expenses CRUD |
| api/recurring-expenses/[id].ts | PATCH | Update/toggle recurring expense |
| api/recurring-expenses/upcoming.ts | GET | Upcoming expenses for ?month= with match status |

## Existing patterns (follow exactly)

### API route structure

```typescript
import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

export const GET: APIRoute = async ({ request }) => {
  try {
    const db = getDB();
    const result = await db.prepare('SELECT ...').all();
    return new Response(JSON.stringify({ success: true, data: result.results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

For routes with URL params: `export const PATCH: APIRoute = async ({ params, request }) => {`
Access param via `params.id`. Parse body via `await request.json()`.

### React component pattern

```typescript
import { useState, useEffect } from 'react';

export default function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/endpoint')
      .then(res => res.json())
      .then(json => { setData(json.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;
  // render
}
```

### Styling (inline styles only)

All components use inline `style={{}}` objects. These are the design tokens used throughout:

```
Fonts:
  Headings: fontFamily: 'Georgia, serif'
  Body: fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

Colours:
  Background: '#FAFAF7'
  Cards: background '#fff', border '1px solid #e5e5e5', borderRadius '12px', padding '24px'
  Primary green: '#166534' (success, on track, completed milestones)
  Light green bg: '#f0fdf4'
  Danger red: '#dc2626' (over target, failures, overdue)
  Light red bg: '#fef2f2'
  Warning amber: '#f59e0b' (approaching target, warnings, in progress states)
  Light amber bg: '#fffbeb'
  Text dark: '#111827'
  Text secondary: '#6b7280'
  Text muted: '#9ca3af'

Spacing:
  Section gap: marginBottom '32px'
  Card padding: '24px' (desktop), '16px' (mobile)

Common card:
  { background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5', padding: '24px' }
```

### Database conventions

- Migrations are sequential: `0001_init.sql`, `0002_seed.sql`, etc. Next migration is `0005_*.sql`.
- Booleans stored as INTEGER (0/1)
- Dates stored as TEXT in ISO format or `datetime('now')`
- `target_date` on milestones uses `YYYY-MM` format (e.g., '2026-04')
- All queries use explicit column names (no SELECT *)

## DB schema (current state)

```sql
-- transactions
(id INTEGER PK AUTOINCREMENT, date TEXT, date_str TEXT, description TEXT, amount REAL,
 balance REAL, category TEXT, category_override TEXT, month_key TEXT, created_at TEXT)
UNIQUE(date_str, description, amount)

-- milestones
(id TEXT PK, label TEXT, detail TEXT, target_date TEXT 'YYYY-MM', completed INTEGER 0/1, completed_at TEXT)

-- bank_balances
(id INTEGER PK AUTOINCREMENT, bank_australia REAL, nab_business REAL, recorded_at TEXT)

-- documents
(id TEXT PK, label TEXT, checked INTEGER 0/1, checked_at TEXT)

-- uploads
(id INTEGER PK AUTOINCREMENT, filename TEXT, txn_count INTEGER, new_count INTEGER,
 duplicate_count INTEGER, uploaded_at TEXT)

-- merchant_rules
(id INTEGER PK AUTOINCREMENT, pattern TEXT UNIQUE, category TEXT, source_description TEXT, created_at TEXT)

-- recurring_expenses
(id INTEGER PK AUTOINCREMENT, name TEXT, amount REAL,
 frequency TEXT CHECK('monthly','fortnightly','quarterly'),
 day_of_month INTEGER nullable, category TEXT, match_pattern TEXT, active INTEGER 0/1, created_at TEXT)
```

## Seeded milestones (current IDs)

```
meet-accountant      | Feb 2026 | uncompleted
interim-pl           | Mar 2026 | uncompleted
pay-ato-overdue      | Mar 2026 | completed
clean-banking        | Mar 2026 | completed
book-broker          | Apr 2026 | uncompleted
pay-ato-assessment   | Apr 2026 | completed
pre-approval         | May 2026 | uncompleted
house-hunt           | Jun 2026 | uncompleted
settlement           | Oct 2026 | uncompleted
```

## Seeded document IDs

```
fy23-24-noa, fy24-25-noa, interim-pl, income-letter,
personal-statements, business-statements, trust-deed,
child-support, id-100-points, rental-lease
```

## Domain context

### Financial situation

- Property target: $750,000 in Leopold, Victoria
- Loan: 98% LVR via Family Home Guarantee ($735,000 loan, $15,000 deposit, $0 LMI)
- Total cash needed: $62,000 (deposit $15K + stamp duty ~$40K + other costs ~$7K)
- Balances: Bank Australia ~$13K (personal), NAB Business ~$74K (trust operating account)
- Income: $6,000/month owner's drawings from Macedon Digital Pty Ltd family trust
- Rent: $2,389.88/month to Hayden Leopold
- Known recurring expenses total: ~$3,234/month

### Trust structure

Macedon Digital Pty Ltd operates as trustee of a family trust. Will is sole director and sole beneficiary. Lenders assess trust income by:
- Requiring 2 years of personal + trust tax returns with NOAs
- Using the lower of two years' trust distributions as base income
- Allowing add backs (depreciation, one off expenses, personal super contributions)
- Some lenders won't accept trust income; broker must select compatible lender panel

### Family Home Guarantee

- Single parent with dependent children (eligible)
- Individual taxable income must be under $125,000
- Must not own property individually or through entities/trusts
- Owner occupier only
- Places limited per FY (FY27 allocation opens 1 July 2026)
- Participating lenders only

### Broker assessment methodology

- Serviceability assessed at buffer rate: higher of actual rate or ~9%
- Living expenses compared to HEM (Household Expenditure Measure); broker uses the higher figure
- HEM for single parent, 2 dependants, regional Victoria: approximately $2,800 to $3,200/month
- Genuine savings = money accumulated over 3+ months through regular deposits, not lump sums

## Rules

- Light theme only. Never dark backgrounds.
- No dashes (hyphens, em dashes, en dashes) in any UI text or output.
- All currency: AUD with $ prefix, comma separators, 2 decimal places for transactions, no decimals for round summary figures
- Mobile responsive: 375px minimum width
- Git commit with descriptive message after each completed phase
- `npm run build` must pass with zero TypeScript errors before any deploy
- Deploy and verify live URL before reporting any phase complete

## Quality standards

Before reporting any phase complete:
1. Self review all code for correctness, edge cases, and adherence to the patterns documented above
2. Verify against the specific acceptance criteria listed for that phase in PLAN.md
3. Run `npm run build` (must pass clean, zero errors)
4. Test API endpoints manually: correct JSON shape `{ success: true/false, data/error }`
5. Verify mobile viewport (375px) renders without overflow for any UI changes
6. Git commit: `git add -A && git commit -m "feat: [phase description]"`
7. Deploy: `npm run build && wrangler pages deploy dist/`
8. Run remote migrations if any new `.sql` files were added this phase
9. Verify live URL at home-loan-tracker.pages.dev works correctly

## Session log

Append to SESSION_LOG.md at branching points, after major milestones, and at project end. Not after every phase.