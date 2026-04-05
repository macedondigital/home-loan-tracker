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
