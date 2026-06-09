# Session Log

## Phase 1: Project scaffolding, D1, first deploy (2026-04-05)

**Completed:**
- Astro 5.18.1 project scaffolded with React islands, Tailwind v4, TypeScript strict
- @astrojs/cloudflare v12.6.13 (pinned to v12 for Pages compatibility; v13+ requires Astro 6 and deploys as Worker)
- Cloudflare D1 database created in OC region (Melbourne), ID: 8a3525d0-551d-4450-a9f5-8f864acd36ed
- Schema: 5 tables (transactions, milestones, bank_balances, documents, uploads) with indexes
- Seeded: 9 milestones, 10 document checklist items
- Deployed to Cloudflare Pages: https://home-loan-tracker.pages.dev
- Health endpoint live: /api/health returns all tables from D1
- APP_SECRET set (auto-generated). APP_PASSWORD pending Will's input.
- GitHub repo: https://github.com/macedondigital/home-loan-tracker

**Key decisions:**
- wrangler installed as project dependency (not global) due to npm permissions
- pages_build_output_dir used in wrangler.toml (account_id not supported for Pages config)
- D1 access via `import { env } from 'cloudflare:workers'` (current pattern)
- All resource names: `home-loan-tracker` (not `home-by-october`)
- Seed data labels avoid hyphens per "no dashes in UI text" rule

**Pending for Phase 2:**
- Will needs to set APP_PASSWORD via wrangler CLI
- REFERENCE_PROTOTYPE.jsx and test-data/ not yet provided by Will

## Phases 2, 3, 4 (2026-04-05)

**Phase 2: Auth middleware**
- Login page, HMAC-SHA256 signed cookie (30 day), middleware redirects/401s
- APP_PASSWORD set by Will

**Phase 3: CSV upload and transaction storage**
- Categorisation engine: 12 categories with regex patterns, targets, colours
- Bank Australia CSV parser: handles quoted fields, POS prefixes, amount formats
- Upload endpoint with INSERT OR IGNORE deduplication
- Transactions, months, summary API endpoints

**Phase 4: Dashboard overview**
- Balance cards: Bank Australia, NAB Business, Combined, Buffer after $62k
- Balance input saves snapshots to D1
- Weekly check-in: days since last upload, problem category summary
- Broker readiness: 10 criteria scored from live data with SVG ring
- Timeline progress bar: X/9 milestones
- Problem categories trend chart (stacked bar, pure CSS)
- Nav: desktop top bar + mobile bottom tab bar
- API endpoints: balances, readiness, milestones, uploads/latest

**Key decisions:**
- Scoped Cloudflare API token set in ~/.zshrc (replaces OAuth flow)
- Custom stacked bar chart (pure CSS) instead of Recharts for Phase 4 (avoids Recharts SSR issues on Cloudflare; Recharts can be added for Phase 5 if needed)
- Milestones API includes toggle (PATCH) for Phase 6 timeline page

## Phases 5, 6 (2026-04-05)

**Phase 5: Spending analysis page**
- Drag and drop CSV upload zone with success/error messages
- Month selector dropdown, summary metrics row
- Category breakdown table with progress bars and target markers
- Problem categories trend chart
- Transaction list with inline category override dropdown

**Phase 6: Timeline and broker readiness pages**
- Timeline: interactive milestone checklist with toggle persistence, progress bar, key numbers card
- Broker Ready: large readiness score ring, 10 criteria pass/fail, borrowing capacity table (3 scenarios), documents checklist with toggle persistence
- Documents API: GET /api/documents, PATCH /api/documents/:id

## Phase 7: Balance history and final polish (2026-04-05)

**Completed:**
- Balance history SVG line chart on dashboard (shows combined balance over time)
- Upload history list on dashboard (filename, date, new/duplicate counts)
- Uploads list API endpoint (GET /api/uploads)
- PWA manifest with standalone mode and theme color
- SVG favicon (green rounded square with "H")
- Meta tags: theme-color, apple-mobile-web-app-capable, apple-touch-icon
- Error boundaries on all React islands
- 404 page
- Middleware updated to allow static assets (manifest.json, favicon.svg) through auth

**Not done (noted for future):**
- PNG icons for iOS home screen (needs ImageMagick; SVG works for now)
- Lighthouse audit (requires browser-based tooling)
- REFERENCE_PROTOTYPE.jsx and test-data/ still not provided

**Project status: All 7 phases complete. Dashboard is live at https://home-loan-tracker.pages.dev**

## Scenarios tab: home purchase + tax planner (2026-06-09)

**Completed:**
- New fifth tab "Scenarios" (nav + mobile bottom tab), wired like the others
  (scenarios.astro wraps Scenarios island in ErrorBoundary)
- Three side-by-side property-price scenarios ($650k/$700k/$750k) over shared
  income/cash/loan inputs; each shows property breakdown, tax sliders
  (super/prepay/bucket), tax breakdown, cash flow to October settlement, and a
  surplus/deficit indicator with a 30 June buffer-breach pill
- Pure financial logic in src/lib (tax.ts, stamp-duty.ts, loan.ts, scenario.ts)
  built test-first; 28 vitest cases assert the brief's reference values
  (VIC duty $650k->$34,070 / $700k->$37,070 / $750k->$40,070) and reproduce the
  prototype's default-scenario numbers exactly
- Inline-styled React components matching BrokerReady conventions; range-slider
  thumb styling added to global.css (.scenario-range)
- Local state persists to localStorage (hbo-scenarios-v1); "Reset all" restores
  defaults
- Ported from designs/reference-prototype.html. Corrected the prototype's false
  "FHB stamp duty concession" copy (Will owned 3 prior properties, no concession)
- Added vitest + @astrojs/check dev tooling and an assets/ tree (gitignored) for
  personal financial reference docs

**Decisions:** tab name "Scenarios"; inline styles (not Tailwind, despite the
brief) to match the codebase; localStorage persistence now (D1 deferred).

**Deferred (future phases per brief):** expense accordion, Jul-Oct income
forecasting, D1 persistence, link monthly cash growth to Spending-tab actuals.

**Verification:** npm run test (28/28), npm run build clean, astro check clean
for new code, authenticated SSR render verified locally, deployed and live.

**Project status: Scenarios tab live at https://home-loan-tracker.pages.dev/scenarios**
