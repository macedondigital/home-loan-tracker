# 2026-06-29 — EOFY data refresh (Scenarios + Compare planner)

Refresh the planner baselines from end-of-FY26 data: the 29 June P&L, updated bank
balances, and the $60k concessional super contribution. EOFY (one operating day left).

## Changes
- **Confirmed the trust reports on ACCRUAL, not cash** (settled from the FY25 trust return: bad debts $3,872, depreciation $9,288, expense reconciliation adjustment $569, and AR on the balance sheet are all accrual markers). The accountant (Sarah) said "cash" in a hurry; she was wrong. Planner uses accrual.
- 29 June P&L: net profit **$288,730 accrual** / $266,787 cash; total expenses $125,532. Net dropped from the $307,534 (21 June) baseline as more expenses booked.
- **$60k super** contributed 24 June (BPAY to Hostplus). Added a `superAlreadyPaid` shared input so an already-paid concessional contribution feeds the tax deduction but is NOT deducted from cash again (the live balances already reflect it). Avoids a double-count bug. Scenario super lever default 80k -> 60k.
- Balances updated: NAB operating $70,168 (was a $137k default), super now ~$182k TSB.
- **Folded late-June deductibles the morning P&L had not booked** into the incurred accordion + dropped the trust-profit baseline to **$278,754**: bookkeeping $5,722.20 (MicroChilli via Ignition, filed by the bank as "Transfers out" = unbooked), DataforSEO $2,253.64 (28 June), BizCover $2,000 (on Will's personal card -> beneficiary loan). See [[ignition-bookkeeping-unbooked]].
- Prepayables: removed bookkeeping + BizCover (paid), added Google Ads $5k (planned, uncommitted); scenario prepay lever default -> 0.
- Storage key bumped `hbo-scenarios-v1` -> `v2` -> `v3` to force new baselines to load.
- BizCover-on-personal-card: advised reimburse OR beneficiary loan; flagged that the books show a $2k beneficiary loan but the Insurance line is only $1,242.47, so the expense may be unmatched - confirm with bookkeeper.

## Files
- `src/lib/scenario.ts`, `src/lib/scenario.test.ts`
- `src/data/expenses.ts`
- `src/components/SharedInputs.tsx`, `Scenarios.tsx`, `Compare.tsx`

## Commits
- `cd8d157` refresh planner from 29 June P&L and the $60k super contribution
- `e851d03` fold late-June paid expenses into incurred list and profit baseline

## Memory captured
- [[ignition-bookkeeping-unbooked]] (new), [[income-data-sources-and-assessment-logic]] + [[project-super-carryforward]] updated.

## Follow-up
- Get a **fully reconciled P&L** once the bookkeeper catches up, then re-baseline trustProfit (the current number is a floor).
- Need current **Bank Australia personal balance** to update the dashboard `bank_balances` and the planner personalCash (left at $10k).
- Dashboard Overview bank balances are a separate manual entry (NAB now $70,168.47).
- Optional: add a "distribute to Kevin" lever (FY25 split $24,923 to Kevin; planner currently taxes all profit to Will).
