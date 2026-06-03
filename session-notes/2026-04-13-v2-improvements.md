# 2026-04-13: V2 Improvements + Income Data + Lender Comparison

## Focus
Complete 9-phase V2 improvement plan, then apply real income data from Freshwater Tax financials, correct FHG eligibility, and add lender comparison.

## Changes Made

### V2 Phases 1-9
1. **Overdue milestone flagging** - API computes overdue/days_overdue, Timeline shows red badges, Dashboard next moves reordered (996ca4b)
2. **Expanded category targets** - 6 new targets: groceries $1,200, kids clothes $200, kids activities $400, holiday $0, fuel $80, health $200 (a05cbad)
3. **Document checklist 3 states** - not_started/in_progress/obtained cycle, Required tags, summary count (f969b14)
4. **Auto balance from CSV** - Upload API extracts closing balance from latest transaction (425d1fe)
5. **Trust income assessment** - income_records table, FY input forms, lender assessment computation (6971f28)
6. **Dynamic borrowing capacity** - Annuity formula at 9% buffer, replaces static cards (b080ec4)
7. **FHG eligibility tracking** - 7 criteria with manual toggle (19d836c)
8. **Genuine savings tracking** - Excludes large one-off outflows, shows adjusted trend (ceebf8a)
9. **HEM benchmarking** - Broker expense benchmark card on Spending tab (6428714)

### Post-V2 Updates
10. **Corrected FHG eligibility** - Single Parent stream: no income cap, unlimited places, previous ownership OK (d4edf30)
11. **Real income data** - FY24 $104,386, FY25 $186,499 assessable, FY26 $223,097 YTD from Freshwater Tax/QuickBooks (d4edf30)
12. **3-year income assessment** - FY24/FY25/FY26 columns, basis mismatch detection, constraining year logic (d4edf30)
13. **Lender comparison** - 13 lenders with per-bank borrowing estimates, likelihood badges, expandable notes (5989ca2)
14. **Updated milestones** - July application timeline, new fy25-noa milestone, readiness check updated (9f2683d)

## New DB tables/columns this session
- documents: added status, required_for_preapproval columns (migration 0005)
- income_records: new table with FY24/FY25/FY26 (migration 0006)
- fhg_eligibility: new table with 7 criteria (migration 0007)
- lenders: new table with 13 lenders (migration 0008)

## Commits (12 total)
996ca4b, a05cbad, f969b14, 425d1fe, 6971f28, b080ec4, 19d836c, ceebf8a, 6428714, d4edf30, 5989ca2, 9f2683d

## Follow-up items
- Update CLAUDE.md to reflect new tables, API routes, and component changes
- FY26 interim P&L needs to be on accrual basis (basis mismatch warning is live)
- Chase Freshwater Tax re: FY25 NOA
- Confirm ANZ 20% shading policy under FHG with broker Simon
- Kevin Smith distribution ($24,923) add-back needs accountant letter
