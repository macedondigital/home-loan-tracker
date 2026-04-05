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
