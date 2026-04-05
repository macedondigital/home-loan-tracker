# Home by October — Accountability Dashboard

## Project overview

A single-user personal finance accountability dashboard that tracks spending, bank balances, milestones, and loan readiness for a home purchase. The user (Will) is a single dad buying a $750,000 home in Leopold, Geelong by October 2026 using the Family Home Guarantee. He uploads weekly Bank Australia CSV statements and manually enters two bank balances (Bank Australia personal + NAB business). The app scores his spending against targets, tracks milestone completion, and tells him whether he's on track.

This is a private tool for one person. Authentication is simple (PIN or password via environment variable). Data must persist across devices and sessions.

## Tech stack

- **Framework:** Astro 5 with React islands (interactive components)
- **Hosting:** Cloudflare Pages
- **Database:** Cloudflare D1 (SQLite at the edge) for all persistent data
- **Styling:** Tailwind CSS
- **Charts:** Recharts (React charting library)
- **Auth:** Simple password gate via Cloudflare Pages middleware (single user, password stored in environment variable `APP_PASSWORD`)
- **Deployment:** GitHub repo, automatic deploy to Cloudflare Pages on push

### Why this stack

- Astro + Cloudflare Pages is Will's established workflow (macedondigital.au, cloudwerx.pages.dev)
- D1 gives persistent SQLite at the edge with zero infrastructure management
- React islands handle the interactive dashboard components within Astro pages
- Single-user auth via middleware avoids the complexity of a full auth system

## Core features

### 1. Weekly statement upload

- Accepts Bank Australia CSV exports (format: `Effective Date,Entered Date,Transaction Description,Amount,Balance`)
- Parses, categorises, and deduplicates against existing transactions server-side
- Stores all transactions in D1
- Supports uploading partial months (e.g. week 1 of April, then week 2, etc.)
- Deduplication key: date + description + amount (prevents duplicates when overlapping CSVs are uploaded)
- Drag-and-drop upload zone with file input fallback
- Shows upload result: "X new transactions imported, Y duplicates skipped"

### 2. Transaction categorisation

Every transaction is categorised using regex matching on the description. Categories and their monthly targets:

| Category | Target | Regex patterns |
|---|---|---|
| Uber Eats | $0 | `uber\s*\*?\s*eats` |
| Amazon | $100 | `amazon` |
| Eating out | $200 | `sushi, pizza, guzman, cafe, bakery, cheesecake shop, schnitz, wharf shed, soul origin, torquay hotel, taste jamaica, luka, woodhouse, paddington, cinnabar, aohna, untitled, twistto, pro whipp, boost leopold, hi sushi, great ocean rolls, gelato, dco leopold, highland milkbar, waurn ponds pty, bellarine estate, rob s amusements` |
| Groceries | No target | `coles, woolworths, a to z meats, fresh food` |
| Fuel | No target | `bp, ampol, apco, shell, mobil, reddy express, mortimer petrol` |
| Retail | $150 | `kmart, rebel, shoes & sox, jd sports, nike, bonds, sportsgirl, myer, bunnings, officeworks, bigw, target, colour blast` |
| Kids activities | No target | `adventure park, bounce, flip out, geelong ninjas, splashdown, buckley, moshtix, codespark, paparazzi studios` |
| Subscriptions | No target | `netflix, spotify, google one, prime vide, swellnet, fairfax, uber.*pass, uberdirect.*pass` |
| Health / pharmacy | No target | `amcal, pharmac, chemist, medicann, instant script, holistic health, professional whey, geelong soul patt, pharmacy` |
| Child support | $1,200 | `sarah smith` |
| Bills / insurance | No target | `agl sales, barwon water, aust unity, vicroads` |
| Income | N/A (credit) | Any transaction with positive amount |
| Other | No target | Anything not matched above |

The categorisation engine must be easy to extend. New merchants should be addable without rewriting logic (store patterns in a config object, not inline).

Transactions can be manually re-categorised by the user via a dropdown on any transaction row. Manual overrides persist and take priority over regex matching.

### 3. Dashboard overview (home page)

**Top metrics row (4 cards):**
- Bank Australia balance (manually entered)
- NAB Business balance (manually entered)
- Combined total
- Buffer after purchase costs ($62,000 target)

**Balance input:** Simple number inputs where Will types his current balances. These save to D1 with a timestamp so historical balance snapshots are preserved. He updates these whenever he checks his banking apps.

**Weekly check-in card:**
- Shows current week number (e.g. "Week 14 of 2026")
- Calculates days since last statement upload
- If > 7 days since last upload: amber warning "Statement overdue — upload this week's transactions"
- If > 14 days: red warning
- Quick summary: "This week you spent $X on Uber Eats, $Y on Amazon, $Z eating out"

**Broker readiness score (out of 10):**
Auto-calculated from:
1. ATO debt fully cleared (milestone checked)
2. 3+ months of clean banking data uploaded
3. Interim P&L signed (milestone checked)
4. FY23-24 and FY24-25 NOAs ready (milestone checked)
5. Zero Uber Eats in most recent full month
6. Amazon under $100 in most recent full month
7. No buy-now-pay-later transactions detected
8. No gambling transactions detected
9. Child support at agreement amount ($1,200 or less in most recent month, or $0 if restructured)
10. Cash buffer above $62,000 (combined balances minus ATO remaining)

Each criterion shows pass/fail with a brief label.

**Timeline progress bar:** Visual bar showing completed milestones out of 9 total.

### 4. Spending analysis page

**Month selector:** Dropdown to pick any month that has transaction data.

**Category breakdown table:**
For the selected month, show each category with:
- Actual spend (sum of transactions)
- Projected spend (if partial month: actual * days_in_month / max_transaction_day)
- Target (if category has one)
- Visual progress bar with target marker
- Status: on track / over target / no target

**Month-over-month trend chart (stacked bar):**
Show the three problem categories (Uber Eats, Amazon, Eating out) across all available months. This is the accountability chart — Will needs to see the trend going down over time.

**Transaction list:**
Sortable table showing all transactions for the selected month:
- Date
- Description (truncated)
- Category (coloured pill, clickable to change)
- Amount
- Colour-code: red for flagged categories over target, green for income

### 5. Timeline / milestones page

Interactive checklist with 9 milestones:

1. Meet accountant (Feb 2026)
2. Get interim P&L signed (Mar 2026)
3. Pay $54k overdue ATO (Mar 2026)
4. Start clean banking (Mar 2026)
5. Book mortgage broker (Apr 2026)
6. Pay $35k ATO assessment (Apr 2026)
7. Pre-approval submitted (May 2026)
8. House hunt in Leopold (Jun-Sep 2026)
9. Settlement day (Oct 2026)

Each milestone: click to toggle complete/incomplete, shows label, detail text, target date, and completion state. State persists in D1.

**Key numbers reference card** below the checklist:
- Property target: $750,000
- Loan via FHG (98%): $735,000
- Deposit (2%): $15,000
- Stamp duty: ~$40,000
- Other costs: ~$7,000
- Total cash needed: $62,000
- LMI cost: $0 (govt guaranteed)
- Est. monthly repayment (6.5%): ~$4,650
- Current rent (dead money): $2,383/month

### 6. Broker readiness page

Expanded version of the readiness score with:
- Each of the 10 criteria shown with pass/fail and detail
- Estimated borrowing capacity table (Conservative $425k / Moderate $600k / Strong $780k)
- Documents checklist (static list with manual tick-off, persisted in D1):
  - FY23-24 NOA
  - FY24-25 NOA
  - Accountant's interim P&L (signed, letterheaded)
  - Accountant's income letter
  - 3-6 months personal bank statements
  - 3-6 months business bank statements
  - Trust deed
  - Child support agreement
  - 100 points of ID
  - Rental lease

## Database schema (Cloudflare D1)

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  date_str TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  balance REAL,
  category TEXT NOT NULL,
  category_override TEXT,
  month_key TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date_str, description, amount)
);

CREATE INDEX idx_txn_month ON transactions(month_key);
CREATE INDEX idx_txn_category ON transactions(category);

CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  completed INTEGER DEFAULT 0,
  completed_at TEXT
);

CREATE TABLE bank_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_australia REAL NOT NULL,
  nab_business REAL NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  checked INTEGER DEFAULT 0,
  checked_at TEXT
);

CREATE TABLE uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  txn_count INTEGER,
  new_count INTEGER,
  duplicate_count INTEGER,
  uploaded_at TEXT DEFAULT (datetime('now'))
);
```

## API routes (Astro server endpoints)

All routes are under `src/pages/api/`:

- `POST /api/upload` — Accept CSV file, parse, categorise, deduplicate, insert into D1. Return { new_count, duplicate_count, total }.
- `GET /api/transactions?month=YYYY-MM` — Return all transactions for a month.
- `PATCH /api/transactions/:id` — Update category_override for a single transaction.
- `GET /api/summary?month=YYYY-MM` — Return category totals, projections, and targets for a month.
- `GET /api/months` — Return list of all months with transaction data.
- `GET /api/milestones` — Return all milestone states.
- `PATCH /api/milestones/:id` — Toggle milestone completion.
- `POST /api/balances` — Save new balance snapshot.
- `GET /api/balances` — Return most recent balance snapshot.
- `GET /api/balances/history` — Return all balance snapshots for charting.
- `GET /api/readiness` — Calculate and return broker readiness score.
- `GET /api/documents` — Return document checklist states.
- `PATCH /api/documents/:id` — Toggle document checked state.

## Auth middleware

File: `src/middleware.ts`

- Check for a session cookie (`hbo-session`) on every request
- If missing or invalid, redirect to `/login`
- Login page: single password field, checked against `APP_PASSWORD` env var
- On success, set `hbo-session` cookie (httpOnly, secure, 30-day expiry) with a signed value
- Cookie signing uses a secret from `APP_SECRET` env var

## Design system

- Light theme only (Will's preference)
- Font: system sans-serif stack for body, Georgia/serif for headings
- Colour palette from the prototype:
  - Primary green: #166534 (progress, success, on-track)
  - Danger red: #dc2626 (over target, Uber Eats)
  - Warning amber: #d97706 (approaching target, eating out)
  - Orange: #ea580c (Amazon)
  - Purple: #7c3aed (retail)
  - Teal: #0891b2 (kids)
  - Gray: #6b7280 (subscriptions, neutral)
  - Pink: #ec4899 (health)
  - Background: #FAFAF7
  - Cards: white with 1px #e8e6df border, 12px radius
- No dashes (hyphens, em dashes, en dashes) anywhere in the UI text
- Responsive: must work on mobile (Will uses his phone to check)

## Infrastructure (CC handles everything)

Will does not do any manual Cloudflare setup. CC must handle all of the following via wrangler CLI:

### GitHub repo
- Initialise git repo locally
- Create GitHub repo via `gh repo create home-by-october --public --source=. --push` (Will has `gh` CLI installed and authenticated)

### Cloudflare D1
- Create database: `wrangler d1 create home-by-october`
- Capture the database_id from the output and write it into `wrangler.toml`
- Run migrations: `wrangler d1 execute home-by-october --local --file=migrations/0001_init.sql` for local dev
- Run migrations on remote: `wrangler d1 execute home-by-october --remote --file=migrations/0001_init.sql`

### Cloudflare Pages deployment
- Deploy via `wrangler pages deploy dist/` after `npm run build`
- Project name: `home-by-october`
- On first deploy, wrangler will create the Pages project automatically
- After first deploy, set up D1 binding: `wrangler pages secret put APP_PASSWORD` (prompt Will for his chosen password)
- Set secret: `wrangler pages secret put APP_SECRET` (generate a random 32-char string automatically)
- D1 binding must be configured in `wrangler.toml` under `[pages]` or via the Cloudflare dashboard binding. CC should attempt via wrangler first, and if that fails, provide Will with the exact dashboard steps as a fallback.

### wrangler.toml structure
```toml
name = "home-by-october"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "home-by-october"
database_id = "<auto-populated after wrangler d1 create>"
```

### Local development
- `wrangler pages dev` for local testing with D1 bindings available
- Or `npm run dev` for Astro dev server (D1 not available locally without wrangler)
- Preferred: use `wrangler pages dev -- astro dev` to get both

### Migrations directory
All SQL migrations go in `migrations/` folder:
- `0001_init.sql` — creates all tables and indexes
- Future migrations increment the number

### Environment variables
```
APP_PASSWORD — Will chooses this when prompted during Phase 2
APP_SECRET — CC generates a random 32-char hex string automatically
```

### If wrangler is not installed
Run `npm install -g wrangler` first. If not logged in, run `wrangler login` and tell Will to complete the browser auth flow.

## Quality standards

- Self-review all output before reporting phase complete
- Verify every API route returns correct data by testing with sample CSV data
- Verify deduplication: uploading the same CSV twice should produce zero new transactions
- Verify category regex against actual Bank Australia transaction descriptions from Will's statements
- Verify month projection logic handles partial months correctly (uses max transaction day, not current date)
- Verify milestone toggle persists and survives page reload
- Verify balance history preserves all snapshots, not just the latest
- Test on mobile viewport (375px width minimum)
- All numbers displayed must be rounded appropriately (no floating point artifacts)
- All currency displayed as AUD with $ prefix, comma separators, no decimal places for round numbers, 2 decimal places for transaction amounts
- No console errors in production build

## Notes for CC

- **CC handles everything.** Will does not run any terminal commands, create any Cloudflare resources, or do any manual configuration. The only things Will does are: choose a password when prompted, and complete browser auth flows if wrangler or gh CLI need login.
- If any wrangler command fails, troubleshoot and retry. If a Cloudflare operation genuinely cannot be done via CLI, provide Will with the exact minimal steps as a fallback, but exhaust CLI options first.
- Test data is available in the `test-data/` folder. Use Will's actual Bank Australia CSVs to verify parsing and categorisation.
- The reference prototype is in `REFERENCE_PROTOTYPE.jsx` — use it for design patterns, categorisation logic, and component structure. Do not copy it verbatim; adapt it for the Astro + D1 architecture.
- Every phase must end with: git commit, git push, build, deploy to Cloudflare Pages, and verification that the live URL is working. Do not report a phase as complete until confirmed live.
