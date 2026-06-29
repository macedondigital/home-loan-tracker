# 2026-06-29 — Warehouse (SMSF) on the Compare tab

Extend the "Offset vs Super" page to a three-way **Offset vs Super vs Warehouse**
comparison, for Will's planned SMSF industrial-warehouse purchase (~2027). See
[[warehouse-smsf-plan]] for the strategic context.

## Decisions (confirmed with Will)
- **Math = Option A** (proportional share): after-tax lump / SMSF deposit (~$70k / $170k = 41%), curve tracks that share of warehouse equity.
- Curve starts **year 0** (shared origin; fine print notes real purchase ~mid-2027).
- Sublet **baked into** the $22k gross rent (no separate input).
- SMSF costs: admin **$2,500/yr as a slider drag**; **$7,500 setup as a fixed one-off** absorbed.
- LRBA **amortised, paid off by year 20** (no refinance).
- Scope trims: sequencing chart stays 2-line; warehouse on the main chart + table only, sharing super's lock band. **Nav tab label stays "Offset vs Super"** (mobile fit); page H1 is the three-way title.

## Changes
- `projection.ts`: new `amortise(principal, ratePct, termYears)` and `projectWarehouse(inputs)` (pure). Constants `SMSF_EARNINGS_TAX_PCT` 15, `SMSF_SETUP_COST` 7500.
- `Compare.tsx`: collapsible "Warehouse (SMSF)" card (8 sliders), orange `#ea580c` third curve, generalised `Chart` from 2 series to N, Warehouse column in the at-a-glance table (bold = yearly leader), three-way verdict line, SMSF caveats (BRP qualification, market rent, cost drag, concentration/illiquidity). Storage key `hbo-compare-v2` -> `v3`.
- `projection.test.ts`: +7 tests (amortise schedule, projectWarehouse share/start/growth/cap).
- Verified with a temporary server-render smoke test (renderToString), then removed.

## Files
- `src/lib/projection.ts`, `src/lib/projection.test.ts`
- `src/components/Compare.tsx`
- `PLAN.md` (spec appended)

## Commits
- `a098b8a` docs: spec Offset vs Super vs Warehouse (Compare Phase 2)
- `dd5f444` feat: add warehouse (SMSF) as a third destination on the Compare tab

## Follow-up
- Tune warehouse defaults when Will brings a real SMSF lending quote or independent valuation.
- Sarah validates BRP qualification and structure before any action.
