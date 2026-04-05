# PLAN.md — Home by October Dashboard

## Build phases

### Phase 1: Project scaffolding, GitHub, D1, and first deploy

**Tasks:**
- Initialise Astro 5 project with React integration and Tailwind CSS
- Verify `wrangler` is installed and authenticated (if not: `npm install -g wrangler` then `wrangler login` and prompt Will to complete browser auth)
- Verify `gh` CLI is installed and authenticated (if not: prompt Will to install/auth)
- Create GitHub repo: `gh repo create home-loan-tracker --public --source=. --push`
- Create D1 database: `wrangler d1 create home-loan-tracker`
- Capture the `database_id` from the output and write it into `wrangler.toml`
- Configure `wrangler.toml` with D1 binding, compatibility flags, and Pages config
- Create `migrations/0001_init.sql` with full database schema (all tables from CLAUDE.md)
- Run migrations locally: `wrangler d1 execute home-loan-tracker --local --file=migrations/0001_init.sql`
- Run migrations on remote: `wrangler d1 execute home-loan-tracker --remote --file=migrations/0001_init.sql`
- Configure `astro.config.mjs` with `@astrojs/cloudflare` adapter
- Create `src/lib/db.ts` helper for D1 access from Astro API routes
- Create a test API route `GET /api/health` that queries D1 and returns `{ ok: true, tables: [...] }`
- Create seed script to insert the 9 milestones and 10 document checklist items into D1
- Run seed on remote D1
- Build the project: `npm run build`
- Deploy to Cloudflare Pages: `wrangler pages deploy dist/`
- Generate a random 32-char hex string for APP_SECRET and set it: `wrangler pages secret put APP_SECRET`
- Prompt Will to choose a password, then set it: `wrangler pages secret put APP_PASSWORD`
- Git commit and push: `git add -A && git commit -m "feat: phase 1 — project scaffolding, D1, first deploy" && git push`
- Verify the deployed URL returns the health check successfully

**Acceptance criteria:**
- GitHub repo exists at github.com/macedondigital/home-loan-tracker
- `wrangler d1 list` shows the home-loan-tracker database
- All tables exist in remote D1 (verified via health endpoint)
- Milestones and documents are seeded in remote D1
- Site is live on Cloudflare Pages at home-loan-tracker.pages.dev
- Health endpoint returns `{ ok: true }` on the live URL
- Secrets APP_PASSWORD and APP_SECRET are set in Cloudflare Pages

**On completion:** "Phase 1 complete. Next Phase 2: Authentication middleware"

---

### Phase 2: Authentication middleware

**Tasks:**
- Create `src/pages/login.astro` with a single password field and submit button
- Create `src/middleware.ts` that checks for `hbo-session` cookie
- Create `POST /api/auth/login` endpoint that validates password against `APP_PASSWORD` env var
- On success: set signed httpOnly secure cookie with 30-day expiry
- On failure: return to login with error message
- Redirect all non-login routes to `/login` if no valid session
- Create `POST /api/auth/logout` endpoint that clears the cookie
- Add logout button to main layout

**Acceptance criteria:**
- Visiting any page without a session redirects to `/login`
- Entering correct password sets cookie and redirects to `/`
- Entering wrong password shows error, stays on login page
- Cookie persists across page refreshes for 30 days
- Logout clears cookie and redirects to login
- API routes return 401 without valid session cookie

**On completion:** "Phase 2 complete. Next Phase 3: CSV upload and transaction storage"

---

### Phase 3: CSV upload and transaction storage

**Tasks:**
- Create `src/lib/categories.ts` with the full categorisation engine (regex patterns, targets, colours) as an exportable config object
- Create `src/lib/csv-parser.ts` with the Bank Australia CSV parser
- Create `POST /api/upload` endpoint:
  - Accepts multipart form data with CSV file
  - Parses using csv-parser
  - Categorises each transaction using categories engine
  - Generates `month_key` (YYYY-MM) for each transaction
  - Inserts with `INSERT OR IGNORE` using the UNIQUE constraint for deduplication
  - Returns `{ new_count, duplicate_count, total }`
- Create `GET /api/transactions?month=YYYY-MM` endpoint
- Create `GET /api/months` endpoint (returns distinct month_keys with transaction counts)
- Create `PATCH /api/transactions/:id` endpoint for category overrides
- Log each upload to the `uploads` table

**Acceptance criteria:**
- Uploading Will's actual March CSV (`StatementCsv.csv`) successfully parses all 75 transactions
- Each transaction is assigned a category matching the expected output (verified against the mid-March and full-March analyses from the conversation)
- Uploading the same CSV twice: second upload returns `new_count: 0, duplicate_count: 75`
- Uploading a CSV that partially overlaps (e.g. full March after uploading partial March): only new transactions are inserted
- `GET /api/transactions?month=2026-03` returns all March transactions sorted by date descending
- `GET /api/months` returns `[{ month_key: "2026-03", count: 75 }]`
- Category override via PATCH persists and is returned in subsequent GETs
- Income transactions (positive amounts) are categorised as "income"
- Uber Eats transactions match: "UBER *EATS", "POS #xxxxxx-UBER *EATS HELP.UBER.COM"
- Upload endpoint rejects non-CSV files with appropriate error message

**On completion:** "Phase 3 complete. Next Phase 4: Dashboard overview page"

---

### Phase 4: Dashboard overview page

**Tasks:**
- Create main layout `src/layouts/Layout.astro` with:
  - Navigation: Overview, Spending, Timeline, Broker Ready
  - "Plan D" header with "Home by October" title
  - Footer with the quote
  - Mobile responsive nav (hamburger or tab bar)
- Create `src/pages/index.astro` with React island for the dashboard
- Create `src/components/Dashboard.tsx` React component:
  - **Balance cards:** Bank Australia, NAB Business, Combined, Buffer after $62k
  - **Balance inputs:** Two number fields that save to D1 via `POST /api/balances`
  - **Weekly check-in card:** Days since last upload, weekly spending summary for problem categories
  - **Broker readiness score:** Out of 10, circular progress ring, pass/fail list
  - **Timeline progress bar:** Shows X/9 milestones complete
  - **Problem categories trend chart:** Stacked bar using Recharts showing Uber Eats, Amazon, Eating out across all months
- Create `POST /api/balances` and `GET /api/balances` endpoints
- Create `GET /api/readiness` endpoint that calculates the 10-point score from live data
- Create `GET /api/summary?month=YYYY-MM` endpoint that returns category totals, projections, and targets

**Acceptance criteria:**
- Dashboard loads and displays all sections without errors
- Balance inputs save to D1 and persist across page reloads
- Balance inputs update the combined total and buffer cards in real time
- Weekly check-in correctly calculates days since last upload from the `uploads` table
- Readiness score correctly evaluates all 10 criteria against actual data
- Trend chart displays all available months with correct category totals
- Mobile: all cards stack vertically, chart is horizontally scrollable if needed, text is readable at 375px
- All currency values are formatted with $ prefix and comma separators
- No floating point artifacts in any displayed number

**On completion:** "Phase 4 complete. Update CLAUDE.md with current state and append to SESSION_LOG.md. Next Phase 5: Spending analysis page"

---

### Phase 5: Spending analysis page

**Tasks:**
- Create `src/pages/spending.astro` with React island
- Create `src/components/SpendingAnalysis.tsx`:
  - **Month selector dropdown** populated from `/api/months`
  - **Summary metrics row:** Total spent, Projected month total, Transaction count
  - **Category breakdown table** with:
    - Category name and colour dot
    - Actual spend (sum)
    - Projected spend (actual * days_in_month / max_transaction_day)
    - Target amount
    - Progress bar with target marker (black line)
    - Bar turns red when projected to exceed target
  - **Month-over-month trend chart** (Uber Eats, Amazon, Eating out across all months)
  - **CSV upload zone** (drag-and-drop + file picker) at the top of the page
  - **Transaction list table:**
    - Columns: Date, Description, Category (pill with dropdown to change), Amount
    - Sorted by date descending
    - Income rows highlighted green
    - Flagged categories highlighted with category colour
    - Category dropdown saves override via `PATCH /api/transactions/:id`
    - Paginated or virtualised if > 100 transactions

**Acceptance criteria:**
- Month selector shows all months with data, defaults to most recent
- Switching months updates all components (metrics, categories, chart, transactions)
- Category totals match manual calculation (verified against March data)
- Projection logic: if 19 transactions span days 1-19 of a 31-day month, projection = actual * 31/19
- Progress bars render correctly with target markers
- Red highlight appears when projected total exceeds target
- Category dropdown on transaction rows saves immediately and updates category totals
- Upload zone accepts CSV and refreshes the page data after successful upload
- Upload zone shows success/error message
- Table is readable on mobile (horizontal scroll or card layout for narrow screens)

**On completion:** "Phase 5 complete. Next Phase 6: Timeline and broker readiness pages"

---

### Phase 6: Timeline and broker readiness pages

**Tasks:**
- Create `src/pages/timeline.astro` with React island
- Create `src/components/Timeline.tsx`:
  - Interactive milestone checklist (9 items)
  - Click to toggle complete/incomplete
  - Completed items show green check, strikethrough text
  - Progress bar at top
  - Key numbers reference card below
  - State persists via `PATCH /api/milestones/:id`
- Create `src/pages/broker.astro` with React island
- Create `src/components/BrokerReady.tsx`:
  - Readiness score with large circular progress ring
  - Each of 10 criteria with pass/fail, label, and detail
  - Borrowing capacity table (3 scenarios)
  - Documents checklist with toggle (persists via `PATCH /api/documents/:id`)
- Create milestone and document API endpoints:
  - `GET /api/milestones`
  - `PATCH /api/milestones/:id`
  - `GET /api/documents`
  - `PATCH /api/documents/:id`

**Acceptance criteria:**
- Milestone toggle persists across page reloads and devices
- Milestone completion updates the readiness score on the overview page
- Documents checklist toggle persists
- Readiness score recalculates correctly when milestones change
- Borrowing capacity table shows correct numbers ($425k / $600k / $780k)
- Key numbers card shows all purchase-related figures
- All pages work on mobile at 375px width

**On completion:** "Phase 6 complete. Update CLAUDE.md with current state and append to SESSION_LOG.md. Next Phase 7: Balance history and final polish"

---

### Phase 7: Balance history and final polish

**Tasks:**
- Create `GET /api/balances/history` endpoint
- Add balance history chart to dashboard (line chart showing combined balance over time)
- Add "last updated" timestamp display next to balance inputs
- Add upload history section (list of past uploads with dates and counts from `uploads` table)
- PWA manifest for add-to-home-screen on mobile
- Favicon and meta tags (title: "Home by October")
- Error boundaries on all React components
- Loading states for all data-fetching components
- Empty states for pages with no data yet (e.g. first visit before any uploads)
- 404 page
- Final responsive QA pass on mobile (iPhone SE, iPhone 14, iPad)
- Performance: ensure Lighthouse score > 90 on mobile
- Remove any console.log statements

**Acceptance criteria:**
- Balance history chart shows all recorded snapshots as a line over time
- Upload history shows date, filename, new/duplicate counts for each past upload
- PWA: app can be added to iPhone home screen and opens in standalone mode
- All pages have appropriate loading and empty states
- No console errors in production build
- Lighthouse mobile performance > 90
- All features verified working on Cloudflare Pages production URL

**On completion:** "Phase 7 complete. Update CLAUDE.md with final state and append to SESSION_LOG.md. Project complete."

---

## Git and deployment workflow

CC handles all git and deployment operations. Will does not run any commands.

- Commit after each completed phase: `git add -A && git commit -m "feat: phase X — [description]" && git push`
- Deploy after each phase: `npm run build && wrangler pages deploy dist/`
- Branch: `main` (auto-deploys if GitHub integration is set up, otherwise CC deploys manually via wrangler)
- If D1 migrations are added in a phase, run them on remote before deploying: `wrangler d1 execute home-loan-tracker --remote --file=migrations/XXXX.sql`
- Verify the live URL works after each deploy before reporting phase complete

**Every phase must end with:** git commit, git push, build, deploy, and verification that the live site works. Do not report a phase as complete until the live URL is confirmed working.

## SESSION_LOG.md

Create on first phase. Append after Phases 4, 6, and 7 (at branching points and project end).

## Notes for CC

- **CC handles everything.** Will does not run any terminal commands, create any Cloudflare resources, or do any manual configuration. The only things Will does are: choose a password when prompted, and complete browser auth flows if wrangler or gh CLI need login.
- The CSV format is specific to Bank Australia. Example header: `Effective Date,Entered Date,Transaction Description,Amount,Balance`
- Amounts are prefixed with `$` and negative amounts have a `-` prefix before the `$`
- Some descriptions are wrapped in quotes, some are not
- The regex categorisation must handle descriptions like `POS #589745-UBER *EATS HELP.UBER.COM\` (note the backslash at end, POS prefix, and varying whitespace)
- Will already lives in Leopold at 19 Estuary Boulevard — this app is for his personal use only
- Light theme only, no dark mode toggle needed
- No dashes (hyphens, em dashes, en dashes) in any UI text — use alternative punctuation or rewrite
- If any wrangler command fails, troubleshoot and retry. If a Cloudflare operation genuinely cannot be done via CLI, provide Will with the exact minimal steps as a fallback, but exhaust CLI options first.
- Test data is available in the `test-data/` folder. Use Will's actual Bank Australia CSVs to verify parsing and categorisation.
- The reference prototype is in `REFERENCE_PROTOTYPE.jsx` — use it for design patterns, categorisation logic, and component structure. Do not copy it verbatim; adapt it for the Astro + D1 architecture.
