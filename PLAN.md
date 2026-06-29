# PLAN.md: Home by October V2 Improvements

9 phases. Each builds on the last. Phases 5 and 6 are tightly coupled (6 reads income data from 5). Run in order.

---

## Phase 1: Overdue milestone flagging and next moves reprioritisation

**Why**: "Meet accountant" (Feb 2026) and "Get interim P&L signed" (Mar 2026) are past due and on the critical path for pre approval. The UI treats them identically to future milestones. "Your next moves" on the Overview prioritises spending cuts over these blockers, which is the wrong order.

**Files to modify**:
- `src/pages/api/milestones/index.ts`
- `src/components/Timeline.tsx`
- `src/components/Dashboard.tsx`

**Implementation**:

`api/milestones/index.ts`: After fetching all milestones, compute two additional fields for each:
- `overdue`: boolean. True when `completed === 0` AND `target_date` (format `YYYY-MM`) is before the current `YYYY-MM`. Compare as strings since the format is lexicographically sortable.
- `days_overdue`: number. If overdue, calculate days between the 1st of the `target_date` month and today. If not overdue, return 0.

Add these to each milestone object in the response. Do not change the DB schema.

`Timeline.tsx`: For each milestone row where `overdue === true && completed === 0`:
- Add a red badge inline with the label: text "OVERDUE", styled `{ background: '#fef2f2', color: '#dc2626', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' }`
- Add subtle left border to the row: `borderLeft: '3px solid #dc2626'`
- Show days overdue count in the detail text area: e.g., "42 days overdue"
- Completed milestones and future milestones render unchanged

`Dashboard.tsx`: The "Your next moves" section (around line 100 to 200, look for the numbered list with green circles) currently hardcodes spending warnings and static milestone references. Refactor to:
1. Fetch milestones from `/api/milestones` in the existing `useEffect` data fetch
2. Build the next moves list dynamically:
   - First: overdue uncompleted milestones, sorted by `target_date` ascending (earliest overdue first). Use red numbered circles instead of green.
   - Second: spending categories currently over target (existing logic for Retail, Eating out, etc). Use amber numbered circles.
   - Third: upcoming uncompleted milestones due this month or next month (not overdue). Use green numbered circles.
3. Cap the list at 5 items maximum

**Acceptance criteria**:
- [ ] `GET /api/milestones` response includes `overdue` and `days_overdue` for each milestone
- [ ] "Meet accountant" returns `overdue: true` with `days_overdue` approximately 60+ (it was due Feb 2026, now Apr 2026)
- [ ] "Pay $54k overdue ATO" returns `overdue: false` (completed, regardless of date)
- [ ] Timeline tab shows red OVERDUE badge on "Meet accountant" and "Get interim P&L signed"
- [ ] Timeline tab does NOT show badge on completed milestones or future milestones
- [ ] "Your next moves" on Overview lists overdue milestones before spending warnings
- [ ] "Book mortgage broker" (Apr 2026, not overdue yet if current month) appears after spending items
- [ ] Numbered circles use red for overdue, amber for spending, green for upcoming
- [ ] Mobile (375px) renders badges and list without overflow or truncation

✅ Phase 1 complete. Next → Phase 2: Expand category spending targets

---

## Phase 2: Expand category spending targets

**Why**: Only Retail ($150) and Eating out ($200) have targets. Groceries ($676 this month, no target) and Kids clothes ($366, no target) have no accountability. Adding targets to all major discretionary categories gives full spending visibility.

**Files to modify**:
- `src/lib/categories.ts` (modify `CATEGORY_TARGETS` map)

**Implementation**:

Locate the `CATEGORY_TARGETS` object/map in `categories.ts`. Add these entries (keeping existing retail and eating_out targets):

| Category ID | Target | Rationale |
|---|---|---|
| groceries | 1200 | ~$300/week for a family of three |
| kids_clothes | 200 | Seasonal variance but caps impulse buys |
| kids_activities | 400 | Reasonable activities budget |
| holiday | 0 | Zero until settlement (actively saving) |
| fuel | 80 | Low usage based on transaction history |
| health | 200 | Necessary but bounded |

Verify the category IDs match the keys actually used in the CATEGORIES array. The existing IDs visible in the codebase include: `groceries`, `kids_clothes`, `kids_activities` (or `kids`), `holiday`, `fuel`, `health`, `retail`, `eating_out`. Check the actual key names in `categories.ts` and use those exactly.

No component changes needed. `SpendingAnalysis.tsx` already reads from `CATEGORY_TARGETS` and renders the `$X / $Y` format with red highlighting when exceeded.

**Acceptance criteria**:
- [ ] `CATEGORY_TARGETS` contains entries for all 8 categories listed above
- [ ] Spending tab shows `$X / $Y` format for groceries, kids clothes, kids activities, holiday, fuel, health (in addition to existing retail and eating out)
- [ ] Holiday shows red indicator when any amount is spent (target is $0)
- [ ] Categories without targets (subscriptions, bills, other, income) still show amount only, no target
- [ ] Projections continue to display correctly alongside targets
- [ ] No TypeScript errors in build

✅ Phase 2 complete. Next → Phase 3: Document checklist status states

---

## Phase 3: Document checklist status states

**Why**: The 10 document items on Broker Ready are binary checked/unchecked but all show as unchecked. A broker prep workflow needs three states and visibility into which documents are required for pre approval.

**Files to create/modify**:
- `migrations/0005_document_status.sql` (new)
- `src/pages/api/documents/index.ts` (modify response)
- `src/pages/api/documents/[id].ts` (modify to accept status)
- `src/components/BrokerReady.tsx` (modify documents section)

**Implementation**:

Migration `0005_document_status.sql`:
```sql
ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE documents ADD COLUMN required_for_preapproval INTEGER NOT NULL DEFAULT 0;

UPDATE documents SET required_for_preapproval = 1 WHERE id IN (
  'fy23-24-noa', 'fy24-25-noa', 'interim-pl', 'income-letter',
  'personal-statements', 'business-statements', 'trust-deed'
);
```

Note: D1 supports ALTER TABLE ADD COLUMN. Run locally and remotely before deploying.

`api/documents/index.ts` GET: Include `status` and `required_for_preapproval` in the SELECT. Sort results: required documents first, then optional.

`api/documents/[id].ts` PATCH: Accept `{ status: 'not_started' | 'in_progress' | 'obtained' }`. Update the `status` column. Also update `checked = 1` and `checked_at = datetime('now')` when status is `'obtained'` for backwards compatibility with readiness score.

`BrokerReady.tsx` documents section:
- Replace checkbox UI with three state indicator per document:
  - `not_started`: grey circle, `{ color: '#9ca3af' }`
  - `in_progress`: amber circle with a dot, `{ color: '#f59e0b' }`
  - `obtained`: green checkmark, `{ color: '#16a34a' }`
- Clicking a document row cycles: not_started → in_progress → obtained → not_started
- Each click sends PATCH to `/api/documents/{id}` with the new status
- Documents with `required_for_preapproval = 1` show a small "Required" tag: `{ background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px' }`
- Summary line above the list: "X of Y required documents obtained"
- Sort: required first, then optional. Within each group, sort by status (not_started last)

**Acceptance criteria**:
- [ ] Migration runs without error on both local and remote D1
- [ ] `GET /api/documents` returns `status` and `required_for_preapproval` for every document
- [ ] `PATCH /api/documents/fy23-24-noa` with `{ "status": "in_progress" }` persists correctly
- [ ] Cycling through all three states works and persists across page reload
- [ ] 7 documents show "Required" tag (fy23-24-noa through trust-deed)
- [ ] 3 documents do NOT show "Required" (child-support, id-100-points, rental-lease)
- [ ] Summary count accurately reflects obtained count out of required total
- [ ] Existing readiness score (which checks `checked` column) still works when status is set to `obtained`
- [ ] Mobile (375px) renders the three states and tags without overflow

✅ Phase 3 complete. Next → Phase 4: Auto calculate balance from CSV upload

---

## Phase 4: Auto calculate balance from CSV upload

**Why**: Balance is manually entered via "Update Balances" but the uploaded CSV already contains running balance data per transaction. Auto extracting the closing balance eliminates a manual step and reduces error.

**Files to modify**:
- `src/pages/api/upload.ts`
- `src/components/Dashboard.tsx`

**Implementation**:

`api/upload.ts`: After the existing CSV parse and transaction insert logic:
1. From the parsed transactions in this batch, find the one with the latest `date` value
2. If that transaction has a non null `balance` field, proceed with auto update
3. Fetch the most recent `bank_balances` row to get the current `nab_business` value
4. Compare: if the latest transaction date in the batch is more recent than the `recorded_at` of the latest bank_balances row (or if no bank_balances rows exist), insert a new bank_balances row with `bank_australia = transaction.balance` and `nab_business = existing_nab_business` (or 0 if no prior rows)
5. If the uploaded batch contains older data than what's already recorded, skip the auto update
6. Add to the upload response: `balance_updated: boolean`, `new_bank_australia: number | null`

`Dashboard.tsx`: After a successful CSV upload (look for the existing upload handler):
1. If the response includes `balance_updated: true`, refresh the balance display by re fetching `/api/balances`
2. Show a small green note below the Bank Australia balance: "Updated from statement" with a fade out after 5 seconds
3. The manual "Update Balances" inputs and Save button remain functional. Manual entry always works as an override.

Edge cases to handle:
- CSV with no balance column (some Bank Australia export formats omit it): skip auto update, return `balance_updated: false`
- Multiple uploads in quick succession: each checks against latest bank_balances row, so the most recent always wins
- First ever upload with no existing bank_balances rows: use `nab_business = 0`

**Acceptance criteria**:
- [ ] Uploading a CSV containing balance data automatically creates a new bank_balances row
- [ ] The bank_australia value matches the balance from the latest dated transaction in the CSV
- [ ] NAB Business balance is preserved from the previous bank_balances row (not zeroed)
- [ ] Uploading older CSV data does NOT overwrite a more recent balance
- [ ] Upload response includes `balance_updated` and `new_bank_australia` fields
- [ ] Dashboard balance cards refresh after upload with auto updated balance
- [ ] "Updated from statement" note appears briefly after auto update
- [ ] Manual "Update Balances" form still functions independently
- [ ] A CSV with no balance column results in `balance_updated: false` and no DB change

✅ Phase 4 complete. Update CLAUDE.md with current state and append to SESSION_LOG.md. Next → Phase 5: Trust income assessment section

---

## Phase 5: Trust income assessment section

**Why**: The single biggest risk to the $750K target is income verification. Brokers assess trust income completely differently from PAYG salary. The tool tracks spending behaviour but has no view of how a lender will assess income. Without this, borrowing capacity estimates are guesswork.

**Files to create/modify**:
- `migrations/0006_income_records.sql` (new)
- `src/pages/api/income/index.ts` (new)
- `src/pages/api/income/assessment.ts` (new)
- `src/components/BrokerReady.tsx` (add section)

**Implementation**:

Migration `0006_income_records.sql`:
```sql
CREATE TABLE income_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  financial_year TEXT NOT NULL UNIQUE,
  trust_distribution REAL DEFAULT 0,
  personal_taxable_income REAL DEFAULT 0,
  add_back_depreciation REAL DEFAULT 0,
  add_back_super REAL DEFAULT 0,
  add_back_one_off REAL DEFAULT 0,
  add_back_other REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO income_records (financial_year) VALUES ('FY24'), ('FY25');
```

`api/income/index.ts`:
- GET: Return all income_records rows ordered by financial_year
- POST: Accept `{ financial_year, trust_distribution?, personal_taxable_income?, add_back_depreciation?, add_back_super?, add_back_one_off?, add_back_other?, notes? }`. Upsert using `INSERT ... ON CONFLICT(financial_year) DO UPDATE SET ...`. Update the `updated_at` timestamp.

`api/income/assessment.ts`:
- GET: Compute lender assessed income from income_records
- Logic:
  1. Fetch FY24 and FY25 rows
  2. For each: `assessable = trust_distribution + add_back_depreciation + add_back_super + add_back_one_off + add_back_other`
  3. Determine `data_completeness`:
     - `'full'` if both years have `trust_distribution > 0`
     - `'partial'` if only one year has data
     - `'empty'` if neither has data
  4. `lender_annual_income`:
     - If both years have data: `Math.min(fy24_assessable, fy25_assessable)` (lower of two years)
     - If one year: that year's assessable (with note about restricted lender panel)
     - If neither: 0
  5. `lender_monthly_income = lender_annual_income / 12`
  6. Return: `{ fy24: { trust_distribution, add_backs_total, assessable }, fy25: { ... }, lender_annual_income, lender_monthly_income, data_completeness, income_sufficient_for_target: lender_annual_income >= 150000 }`

`BrokerReady.tsx`: Add "Lender Income Assessment" section. Place it ABOVE the existing borrowing capacity cards. Structure:

- Section heading: "Lender Income Assessment" (Georgia serif, matching existing headings)
- Two column layout (stacking to single column on mobile): FY24 on left, FY25 on right
- Each column contains editable number inputs for:
  - Trust distribution (the main figure)
  - Add back: Depreciation
  - Add back: Super contributions
  - Add back: One off expenses
  - Add back: Other
  - Computed total: "Assessable income: $XXX,XXX"
- Below the columns: summary card showing:
  - "Lender assessed income (lower of 2 years): $XXX,XXX/year ($XX,XXX/month)"
  - Traffic light indicator: green if >= $150K, amber if $100K to $150K, red if < $100K
  - If `data_completeness === 'empty'`: show prompt "Enter your trust distribution and add back figures from your tax returns to calculate what a broker will assess as your income"
  - If `data_completeness === 'partial'`: show note "Only one year of data. Most lenders require two years for trust income. This restricts your lender panel."
- On any input change: debounce 500ms, POST to `/api/income`, then re fetch `/api/income/assessment` to update the summary
- Input styling: match existing balance inputs on the Dashboard (simple text inputs with $ prefix)

**Acceptance criteria**:
- [ ] Migration creates `income_records` table with FY24 and FY25 rows
- [ ] `GET /api/income` returns both records with all fields
- [ ] `POST /api/income` with `{ "financial_year": "FY24", "trust_distribution": 85000 }` persists correctly
- [ ] `GET /api/income/assessment` with both years populated returns correct `lender_annual_income` (lower of two)
- [ ] Assessment returns `data_completeness: 'empty'` when no figures entered
- [ ] BrokerReady tab renders income section with editable inputs
- [ ] Entering values and tabbing away triggers save and updates the assessment summary
- [ ] Traffic light shows correct colour for the calculated income
- [ ] Empty state shows the prompt text, not zeros
- [ ] Mobile (375px): columns stack vertically, inputs are full width

✅ Phase 5 complete. Next → Phase 6: Dynamic borrowing capacity calculator

---

## Phase 6: Dynamic borrowing capacity calculator

**Why**: The static $425K/$600K/$780K cards are hardcoded. The $780K figure is almost certainly unachievable on the current income. Replace with a real calculation fed by the income assessment from Phase 5 and actual expense data.

**Files to create/modify**:
- `src/pages/api/borrowing-capacity.ts` (new)
- `src/components/BrokerReady.tsx` (replace static cards)

**Implementation**:

`api/borrowing-capacity.ts`:
- GET: Compute maximum borrowing capacity
- Server side data sources:
  1. Income: Fetch from income assessment logic (same as `/api/income/assessment`). If no income data, fallback to $72,000/year ($6,000/month from owner's drawings).
  2. Expenses: Fetch latest month summary from transactions. Use the `total_expenses` (all categories except income) as actual monthly expenses.
  3. HEM: Hardcode $3,100 for single parent, 2 dependants, regional Victoria. This is the floor.
- Calculation:
  ```
  monthly_income = lender_annual_income / 12  (or $6,000 fallback)
  declared_expenses = max(actual_monthly_expenses, 3100)  // HEM floor
  monthly_surplus = monthly_income - declared_expenses
  assessment_rate = 0.09  // 9% buffer
  loan_term_months = 360  // 30 years
  
  // Standard annuity formula for max loan from a given monthly payment
  r = assessment_rate / 12  // monthly rate
  max_repayment = monthly_surplus * 0.95  // 5% safety margin
  if max_repayment <= 0: max_loan = 0
  else: max_loan = max_repayment * ((1 - (1 + r)^(-loan_term_months)) / r)
  
  Round max_loan down to nearest $5,000
  ```
- Response:
  ```json
  {
    "max_loan": 520000,
    "monthly_income": 10000,
    "income_source": "trust_assessment",  // or "fallback_drawings"
    "actual_monthly_expenses": 5683,
    "hem_benchmark": 3100,
    "declared_expenses": 5683,
    "monthly_surplus": 4317,
    "max_monthly_repayment": 4101,
    "assessment_rate": 0.09,
    "target_loan": 735000,
    "target_achievable": false,
    "income_needed_for_target": 185000
  }
  ```
- Also compute `income_needed_for_target`: reverse the formula to find what annual income would be needed to borrow $735,000 given declared expenses and the same assessment rate.

`BrokerReady.tsx`: Replace the three static borrowing capacity cards with:
- A single large card showing:
  - Main figure: "Estimated maximum borrowing: $XXX,XXX" in large text
  - Below: "Based on $XXX,XXX annual assessed income at 9% buffer rate"
  - Comparison bar or text: "Your target: $735,000" with green checkmark if `target_achievable`, red X if not
  - If not achievable: "You would need ~$XXX,XXX annual income to borrow $735,000" (using `income_needed_for_target`)
  - Breakdown section (collapsible or always visible):
    - Monthly income: $X,XXX
    - Declared expenses: $X,XXX (actual) or $X,XXX (HEM floor)
    - Monthly surplus: $X,XXX
    - Max repayment (at 9%): $X,XXX
  - If `income_source === 'fallback_drawings'`: amber warning box: "Using $6,000/month from owner's drawings. Enter your trust income data in the section above for an accurate estimate."
  - Footer note in muted text: "This is an estimate only. Your broker Simon will run a formal serviceability assessment with specific lender criteria."

**Acceptance criteria**:
- [ ] `GET /api/borrowing-capacity` returns all computed fields
- [ ] With no income data entered: uses $72K/year fallback, `income_source: 'fallback_drawings'`
- [ ] With income data: uses the lender assessed figure from income_records
- [ ] `declared_expenses` uses `max(actual_expenses, 3100)` (never below HEM)
- [ ] `max_loan` is correctly calculated using the annuity formula at 9%
- [ ] `income_needed_for_target` reverse calculation is correct
- [ ] Static $425K/$600K/$780K cards are completely removed
- [ ] New dynamic card renders with correct data
- [ ] Target comparison shows red when $735K is not achievable
- [ ] Fallback warning appears when no income data is entered
- [ ] Mobile (375px): card renders without overflow, breakdown text wraps cleanly

✅ Phase 6 complete. Update CLAUDE.md with current state and append to SESSION_LOG.md. Next → Phase 7: FHG eligibility tracking

---

## Phase 7: FHG eligibility tracking

**Why**: The Family Home Guarantee has specific eligibility criteria. Missing one could invalidate the 2% deposit strategy entirely. The tool should surface these as a checklist so nothing is overlooked.

**Files to create/modify**:
- `migrations/0007_fhg_eligibility.sql` (new)
- `src/pages/api/fhg-eligibility.ts` (new)
- `src/components/BrokerReady.tsx` (add section)

**Implementation**:

Migration `0007_fhg_eligibility.sql`:
```sql
CREATE TABLE fhg_eligibility (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  detail TEXT,
  criterion_type TEXT NOT NULL DEFAULT 'manual',
  confirmed INTEGER DEFAULT 0,
  confirmed_at TEXT
);

INSERT INTO fhg_eligibility (id, label, detail, criterion_type) VALUES
  ('single-parent', 'Single parent with dependent children', 'Must have at least one dependent child', 'manual'),
  ('australian-citizen', 'Australian citizen', 'Must be an Australian citizen (not just permanent resident)', 'manual'),
  ('income-cap', 'Taxable income under $125,000', 'Individual taxable income must be below the FHG cap', 'computed'),
  ('no-property', 'No existing property ownership', 'Must not own property individually or through any entity including trusts', 'manual'),
  ('owner-occupier', 'Owner occupier intent', 'Property must be purchased as primary residence', 'manual'),
  ('participating-lender', 'Participating lender confirmed', 'Broker has confirmed submission through an FHG participating lender', 'manual'),
  ('fy27-places', 'FY27 scheme places available', 'FHG allocation for FY27 opens 1 July 2026. Places are limited.', 'manual');
```

`api/fhg-eligibility.ts`:
- GET: Return all criteria. For the `income-cap` criterion (`criterion_type = 'computed'`):
  1. Fetch the most recent FY row from `income_records` where `personal_taxable_income > 0`
  2. If found and < 125000: auto set `confirmed = 1`, include `computed_value` in response
  3. If found and >= 125000: auto set `confirmed = 0`, include `computed_value` and a warning
  4. If no income data: `confirmed = 0`, `status = 'unknown'`, `computed_value = null`
- For manual criteria: return the stored `confirmed` value
- PATCH: Accept `{ confirmed: boolean }` for manual criteria only. Reject PATCH on computed criteria with error.

`BrokerReady.tsx`: Add "FHG Eligibility" section. Place it BETWEEN the broker readiness score and the income assessment section. Structure:
- Heading: "FHG Eligibility" (Georgia serif)
- Summary line: "X of 7 criteria confirmed"
- List of 7 criteria, each with:
  - Green checkmark if confirmed/met
  - Red X if explicitly failed (income over $125K)
  - Grey question mark if unconfirmed or unknown
  - For `income-cap` with computed value: show the actual figure, e.g., "Taxable income: $XX,XXX (under $125,000 cap)"
  - For `fy27-places`: show note "Allocation opens 1 July 2026" if unconfirmed
- Manual criteria are clickable to toggle confirmed/unconfirmed (sends PATCH)
- Computed criteria are not clickable (show a lock icon or "auto" label)

**Acceptance criteria**:
- [ ] Migration creates `fhg_eligibility` table with 7 seeded criteria
- [ ] `GET /api/fhg-eligibility` returns all 7 criteria with correct structure
- [ ] Income criterion auto computes from `personal_taxable_income` in `income_records`
- [ ] If `personal_taxable_income = 0` (no data), income criterion shows grey question mark with "Enter taxable income in the income section below"
- [ ] If `personal_taxable_income = 90000`, income criterion shows green with "$90,000 (under $125,000 cap)"
- [ ] If `personal_taxable_income = 130000`, income criterion shows red with "$130,000 (exceeds $125,000 cap)"
- [ ] Manual criteria toggle on click and persist via PATCH
- [ ] Computed criteria do NOT toggle on click
- [ ] Summary count is accurate
- [ ] Mobile (375px): list renders cleanly

✅ Phase 7 complete. Next → Phase 8: Genuine savings tracking

---

## Phase 8: Genuine savings tracking

**Why**: Balance dropped $118K to $87K due to strategic ATO payments ($89K total). A broker sees a declining balance trend. The tool should tell the genuine savings story: "The balance dropped because of deliberate debt clearance. The underlying savings pattern is positive."

**Files to create/modify**:
- `src/pages/api/savings-analysis.ts` (new)
- `src/components/Dashboard.tsx` (add section)

**Implementation**:

`api/savings-analysis.ts`:
- GET: Compute genuine savings metrics from existing transaction and balance data
- Logic:
  1. Fetch all transactions from the last 3 complete months (use `month_key` to identify)
  2. Identify large one off outflows: transactions where `amount < -5000` in a single transaction (ATO payments, etc). Return these as `excluded_outflows: [{ description, amount, date }]`
  3. Calculate `months_counted` (number of distinct month_keys in the 3 month window)
  4. `total_income`: sum of all transactions where category is 'income' in the window
  5. `total_regular_expenses`: sum of absolute values of all non income transactions, MINUS the excluded large outflows
  6. `net_monthly_savings = (total_income - total_regular_expenses) / months_counted`
  7. Fetch balance history from `bank_balances` (earliest and latest in the window)
  8. `balance_change_raw = latest_combined - earliest_combined`
  9. `balance_change_adjusted = balance_change_raw + sum_of_excluded_outflow_amounts` (adding back the large payments since they were deliberate)
  10. `genuine_savings_trend`: 'positive' if `net_monthly_savings > 200`, 'flat' if between -200 and 200, 'negative' if < -200
- Response:
  ```json
  {
    "net_monthly_savings": 850,
    "balance_change_raw": -31000,
    "balance_change_adjusted": 58000,
    "excluded_outflows": [
      { "description": "ATO Payment ...", "amount": -54000, "date": "2026-03-..." },
      { "description": "ATO Assessment ...", "amount": -35000, "date": "2026-04-..." }
    ],
    "total_excluded": 89000,
    "months_analysed": 3,
    "genuine_savings_trend": "positive"
  }
  ```

`Dashboard.tsx`: Add a "Genuine Savings" card. Place it between the balance summary cards and the "Update Balances" section. Structure:
- Card with light green background if trend positive, light amber if flat, light red if negative
- Main metric: "Net monthly savings: $X,XXX"
- Secondary: "Adjusted balance trend: +$XX,XXX (after excluding $89K in ATO debt clearance)"
- If trend is positive: small green text "Savings pattern is healthy"
- If no data or no excluded outflows: just show net monthly savings without the adjustment narrative

**Acceptance criteria**:
- [ ] `GET /api/savings-analysis` returns all computed fields
- [ ] Large transactions (> $5,000 single outflow) are identified and excluded
- [ ] `net_monthly_savings` reflects income minus regular expenses (not including large one offs)
- [ ] `balance_change_adjusted` correctly adds back excluded outflows to show the "real" trend
- [ ] `total_excluded` matches the sum of all excluded outflow amounts
- [ ] Dashboard renders the card with correct colour based on trend
- [ ] Card shows the exclusion narrative when large outflows are present
- [ ] Mobile (375px): card renders without overflow

✅ Phase 8 complete. Next → Phase 9: HEM benchmarking on Spending tab

---

## Phase 9: HEM benchmarking on Spending tab

**Why**: Brokers compare actual living expenses against the Household Expenditure Measure and use whichever is higher. The Spending tab should show this comparison so the user understands how every dollar of expense reduction directly affects borrowing capacity.

**Files to modify**:
- `src/pages/api/summary.ts` (add HEM fields to response)
- `src/components/SpendingAnalysis.tsx` (add comparison card)

**Implementation**:

`api/summary.ts`: Add these fields to the existing response object (do not break existing fields):
```typescript
hem_benchmark: 3100,  // hardcoded for single parent, 2 dependants, regional Vic
hem_household_type: 'Single parent, 2 dependants, regional Victoria',
actual_living_expenses: number,  // total expenses for the month MINUS rent category
expenses_vs_hem: 'above' | 'below',
hem_gap: number  // actual_living_expenses - hem_benchmark (positive = above HEM)
```

The `actual_living_expenses` must EXCLUDE rent/mortgage because HEM also excludes housing costs. Filter out transactions where `category = 'rent'` (or the category_override is 'rent') before summing.

`SpendingAnalysis.tsx`: Add a "Broker Benchmark" card. Place it between the top summary metrics row and the "Recurring Expenses" section. Structure:
- Card heading: "Broker Expense Benchmark"
- Horizontal bar visualisation (inline SVG or styled div):
  - Full width bar representing a range (e.g., $0 to max of actual or HEM * 1.5)
  - HEM benchmark shown as a vertical marker line at $3,100 with label "HEM benchmark"
  - Actual expenses shown as a filled bar up to `actual_living_expenses`
  - Bar colour: green if below HEM, amber if within 20% above, red if well above
- Text below the bar:
  - If above HEM: "Your living expenses: $X,XXX (excluding rent). Broker will use this figure. Every $100/month reduction increases borrowing by approximately $12,000."
  - If below HEM: "Your living expenses ($X,XXX) are below the HEM benchmark ($3,100). Broker will use HEM as the floor."
- Small note in muted text: "HEM = Household Expenditure Measure. Excludes housing costs. Based on single parent, 2 dependants, regional area."

The "$12,000 per $100" approximation: at 9% assessment rate over 30 years, each $100/month of surplus translates to roughly $12,000 in additional borrowing capacity. This is close enough for a guideline.

**Acceptance criteria**:
- [ ] `GET /api/summary?month=2026-04` includes `hem_benchmark`, `actual_living_expenses`, `expenses_vs_hem`, `hem_gap`
- [ ] `actual_living_expenses` excludes rent transactions (verify by checking the $2,389.88 rent is not included)
- [ ] If actual living expenses are $3,293 and HEM is $3,100: `expenses_vs_hem = 'above'`, `hem_gap = 193`
- [ ] Spending tab renders the benchmark card with bar visualisation
- [ ] Bar marker and label display correctly
- [ ] Impact text changes based on above/below HEM
- [ ] Card renders at 375px width without overflow or visual glitches
- [ ] Existing summary data is not broken (all prior fields still present)

✅ Phase 9 complete. Update CLAUDE.md with final state and append to SESSION_LOG.md. V2 improvements complete.

---

## Phase completion protocol (V2)

Every phase:
1. Run `npm run build` (must pass clean)
2. Run any new migrations on remote: `wrangler d1 migrations apply home-loan-tracker --remote`
3. Git commit: `git add -A && git commit -m "feat: [phase description]"`
4. Git push: `git push`
5. Deploy: `wrangler pages deploy dist/`
6. Verify live URL works at home-loan-tracker.pages.dev
7. Print: "✅ Phase X complete. Next → Phase Y: [title]"

Session log updates after Phases 4, 6, and 9.

---

# PLAN: Scenarios Tab (Home purchase + tax planner)

Adds a fifth tab, "Scenarios", to the dashboard. A client-side scenario planner:
three side-by-side property-price scenarios (default $650k / $700k / $750k) over
a shared set of income, cash, and loan inputs. Each scenario shows a property
breakdown, tax-planning sliders, tax breakdown, and a cash-flow result through
to October settlement, with a surplus/deficit indicator.

Ported from `designs/reference-prototype.html` to the project's actual stack
(Astro 5 + React islands, inline styles, no Tailwind). Phase 1 is local state +
localStorage. D1 persistence and later features are explicitly deferred.

## Decisions (confirmed with Will)

- Tab name: **Scenarios**
- Styling: **inline React `style={{}}`** to match the codebase (the brief
  mentioned Tailwind, but no component uses it; project CLAUDE.md mandates inline).
- Persistence: **localStorage** in Phase 1 (survives reload; does not conflict
  with the planned D1 work).

## Financial rules (authoritative, from the brief)

- Will is NOT a first home buyer. VIC FULL standard stamp duty applies, no FHB
  concession. Reference: $650k -> $34,070, $700k -> $37,070, $750k -> $40,070.
- FHG Single Parent Stream: 98% LVR, 2% deposit, $0 LMI. Federal deposit scheme,
  not a stamp-duty benefit. Prior ownership OK.
- Tax engine: FY25-26 resident brackets + 2% Medicare; super taxed 15%; Division
  293 adds 15% on super when (taxable + super) > $250k; bucket company 25%
  (ruled out, default $0).
- Cash flow: super funded from personal cash first, top-up from business; prepay
  paid by business; personal income tax assumed already covered by PAYG so not
  double-counted at 30 June.

## Architecture

Pure logic in `src/lib/` (framework-free, unit-tested with vitest):
- `tax.ts` - `calcPersonalTax`, `calcDiv293`, super/Div293 constants.
- `stamp-duty.ts` - `calcStampDuty` (VIC standard, no concession).
- `loan.ts` - `calcMonthlyRepayment`.
- `scenario.ts` - `calculate(scenario, shared)` orchestrator + types + defaults.

React components in `src/components/` (inline styles, `s` style-map convention
from `BrokerReady.tsx`):
- `Scenarios.tsx` - top-level island. Owns `shared` + `scenarios` state, derives
  results, persists to localStorage, renders the rest.
- `SharedInputs.tsx` - income/cash/loan grouped input cards.
- `ScenarioGrid.tsx` - responsive 3-up grid of `PropertyScenario`.
- `PropertyScenario.tsx` - one scenario card.
- `RangeInput.tsx` - reusable number-box + slider pair with green-fill track.

Wiring:
- `src/pages/scenarios.astro` wraps `<Scenarios client:load />` in `ErrorBoundary`.
- `navItems` in `Layout.astro` gains the Scenarios entry.

## Phases

### S1: Pure logic + tests
- `tax.ts`, `stamp-duty.ts`, `loan.ts`, `scenario.ts` implemented test-first.
- Acceptance: `npm run test` passes; stamp duty matches the three reference
  values exactly; `calculate()` reproduces the prototype's default-scenario numbers.

### S2: Components + wiring
- All five components built; route + nav added.
- Acceptance: `/scenarios` renders 3 scenarios; sliders + number inputs stay in
  sync; surplus/deficit state, badges, and buffer-breach pill behave as prototype;
  copy corrected (no false FHB-concession claim, no em dashes); mobile 375px has
  no horizontal overflow.

### S3: Persistence + polish + ship
- localStorage load/save for `shared` + `scenarios`; "Reset all" restores defaults.
- `.gitignore`: add `assets/`, `*.csv`, `*.xlsx`, `*.pdf`; create empty `assets/`
  tree (`bank-statements/`, `quickbooks/`, `ato/super-carryforward-screenshots/`).
- Acceptance: tweaks survive reload; Reset clears storage and restores defaults;
  `npm run build` passes clean; deployed and verified at
  `home-loan-tracker.pages.dev/scenarios`.

## Out of scope (future phases, per brief)

- Expense accordion from `src/data/expenses.ts`.
- Jul-Oct income forecasting.
- D1 persistence for scenarios.
- Link monthly cash growth to Spending-tab actuals.

---

# PLAN: Offset vs Super vs Warehouse (Compare tab, Phase 2)

Extends the existing "Offset vs Super" page (`Compare.tsx` + `projection.ts`) with
a third destination for the modelled lump sum: an industrial warehouse bought
through an SMSF (~2027, after the October 2026 home settlement). Three curves,
three destinations, one decision view. Indicative model, not advice.

## Strategic context

Will is weighing a small Business Real Property warehouse (Belmont/Breakwater,
Geelong) bought via SMSF: ~$400-450k, business case is the daily Leopold->Belmont
school run becoming Leopold->Belmont->Breakwater (office)->Belmont->Leopold, plus
likely subletting part of the unit. SMSF builds through FY26-27, purchase mid-2027.

## Decisions (confirmed with Will, this session)

- **Math = Option A (proportional share).** The lump's after-entry-tax amount
  (~$70k of $100k at 30%) is its slice of the SMSF deposit (~$170k), so the curve
  is `share x warehouse equity`, share = afterTaxLump / totalDeposit (~0.41). Keeps
  the page's "what happens to THIS lump sum" framing honest under leverage.
- **Curve starts at year 0** (shared origin with offset/super; fine print notes the
  real purchase is ~mid-2027, so the first ~18 months are a simplification).
- **Sublet baked into gross rent** ($22k), no separate input.
- **SMSF costs:** admin $2,500/yr is a visible slider drag; $7,500 setup is a fixed
  one-off absorbed into year-0 equity with a fine-print note.
- **LRBA amortised, fully paid by year 20** (no refinance); after payoff, rent no
  longer services interest and equity accelerates.
- **Scope trims:** the "Your real plan" sequencing chart stays 2-line (super-now vs
  home-first); warehouse appears on the main 3-way chart + table only and shares
  super's lock band. Nav tab label stays "Offset vs Super" (mobile fit); page H1
  becomes the three-way title.

## Model (per year t, pure functions in projection.ts)

```
afterTaxLump = lumpSum x (1 - entryTax%)              // reuses superContribTaxPct (30)
totalDeposit = price x depositPct                      // 425000 x 0.40 = 170000
loan         = price - totalDeposit                    // 255000
share        = min(1, afterTaxLump / totalDeposit)     // ~0.41
propertyValue[t] = price x (1 + growth)^t
lrbaBalance[t]   = amortise(loan, lrbaRate, term)[t]   // 0 after term (yr 20)
grossRent[t]     = rent x (1 + growth)^t               // rent indexes with property
netRent[t]       = grossRent[t] x (1 - expense%) - interestPaid[t] - admin
afterTaxRent[t]  = max(0, netRent[t]) x (1 - earningsTax%)   // 15%
cumRent[t]       = cumRent[t-1] x (1 + superRate%) + afterTaxRent[t]
equity[t]        = propertyValue[t] - lrbaBalance[t] + cumRent[t] - setupCost
warehouse[t]     = share x equity[t]
```

Inputs (new "Warehouse (SMSF)" assumptions card, RangeInput sliders): price
$425,000, deposit 40%, LRBA rate 8%, LRBA term 20yr, capital growth 4%, gross
rent $22,000, property expenses 15% of rent, SMSF admin $2,500/yr. Reuses
`superContribTaxPct` (entry tax 30%) and `superRatePct` (rent reinvestment).
Constants: SMSF earnings tax 15%, setup $7,500.

## Architecture / files

- `projection.ts`: add `amortise(principal, ratePct, termYears)` -> per-year
  `{ balance, interest }`, and `projectWarehouse(inputs)` -> `WarehouseResult`
  (`series[]` of `{ year, warehouse }`, plus `share`, `start`). Pure, framework-free.
- `projection.test.ts`: characterization tests for `amortise` (balance hits ~0 at
  term, interest decreasing) and `projectWarehouse` (year-0 = share x (deposit -
  setup), property compounds, loan clears by term).
- `Compare.tsx`: new warehouse inputs in state + a collapsible "Warehouse (SMSF)"
  card; generalise `Chart` from 2 series to N (warehouse line = orange `#ea580c`);
  add a Warehouse column to the "At a glance" table; three-way verdict copy; lock
  band now spans warehouse too; fine-print caveats.
- Storage key bumps to `hbo-compare-v3` so new warehouse defaults load.

## Caveats (fine print)

BRP qualification required (else in-house asset rules break it); market rent +
independent valuation mandatory (sole purpose test); SMSF setup/admin is a real
drag (modelled: $7,500 + $2,500/yr); 4% growth is conservative for commercial and
varies by location/tenant; LRBA availability assumed; concentration/illiquidity
risk vs the diversified super destination. Not advice; Sarah validates.

## Acceptance

- `npm run test` passes (existing + new warehouse/amortise tests).
- `/compare` renders the third curve, the warehouse card, and the table column;
  lock band covers warehouse; no em dashes; mobile 375px no horizontal overflow.
- `npm run build` clean; deployed and verified at
  `home-loan-tracker.pages.dev/compare`.