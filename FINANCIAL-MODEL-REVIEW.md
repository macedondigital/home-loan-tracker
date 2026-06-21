# Home Loan Tracker - Financial Model Review Pack

A self-contained description of everything added in one working session to a
single-user home-loan planning dashboard. Written so an independent reviewer can
critique the **financial logic, formulas, and assumptions** without seeing the
codebase. All currency is AUD. The user ("Will") is a sole-director small-business
owner operating through a family trust (Macedon Digital Pty Ltd as trustee),
single parent, buying a ~$750k home in Leopold, Victoria, via the Family Home
Guarantee (FHG) Single Parent Stream (98% LVR, 2% deposit, no LMI). Target
settlement ~October 2026.

The purpose of this pack: **please pressure-test the maths and the assumptions.**
Where I was unsure I have flagged it under "Assumptions to scrutinise".

---

## 1. What was built this session

Two areas of a React/Astro dashboard (client-side calculators; all logic is pure
functions with unit tests - 43 passing):

**A. "Scenarios" tab** - three side-by-side property-price scenarios
($650k / $700k / $750k) sharing one set of income/cash/loan inputs. Each scenario
computes a property breakdown, a tax breakdown (personal tax, super, Division 293,
bucket company), a cash-flow projection to settlement, and a surplus/deficit. Plus:
- A **revenue forecast** (Jul-Oct) netted by monthly outgoings, feeding settlement cash.
- An **expense accordion** (already-incurred vs prepayable, editable).
- A **bucket-company** treatment (modelled as tax-timing, not a cash reduction).
- A **"surplus in offset"** toggle.

**B. "Offset vs Super" tab** - two long-term (0-30 year) comparisons for deploying
a lump sum (default $100k):
- **Passive:** offset (loan rate, tax-free) vs super (higher growth, taxed in, locked).
- **Sequencing:** "super now" vs "pay the home down first, then super" given an
  aggressive payoff.

---

## 2. Core financial primitives (shared)

### 2.1 VIC stamp duty (general rate, NO first-home-buyer concession)

```
calcStampDuty(v):
  v <= 25000   ->  v * 0.014
  v <= 130000  ->  350   + (v - 25000)  * 0.024
  v <= 960000  ->  2870  + (v - 130000) * 0.06
  else         ->  55670 + (v - 960000) * 0.055
```

- **Verified against the VIC State Revenue Office** general-rate schedule.
- Reference values: **$650k -> $34,070**, **$700k -> $37,070**, **$750k -> $40,070**.
- **Assumptions:** Will is **not** a first-home buyer (owned 3 prior properties), so
  no FHB exemption/concession. The VIC principal-place-of-residence (PPR) concession
  caps at $550k, below his price range, so it does not apply. FHG is a federal
  deposit/LMI scheme, not a duty benefit. (All independently confirmed against SRO
  pages; the 2026-27 VIC Budget left these rates unchanged.)

### 2.2 FY2025-26 personal income tax + Medicare

```
calcPersonalTax(taxable):
  tax = 0
  if taxable > 18200:  tax += min(taxable-18200,  26800) * 0.16
  if taxable > 45000:  tax += min(taxable-45000,  90000) * 0.30
  if taxable > 135000: tax += min(taxable-135000, 55000) * 0.37
  if taxable > 190000: tax += (taxable-190000)         * 0.45
  medicare = taxable * 0.02
  total = tax + medicare
```

- Brackets: $0-18,200 nil; 16% to $45k; 30% to $135k; 37% to $190k; 45% above.
- **Assumptions / simplifications:** Medicare levy is a flat 2% with **no** low-income
  reduction and **no** Medicare Levy Surcharge. No offsets (LITO etc.). No HELP/HECS.

### 2.3 Division 293 surcharge

```
calcDiv293(taxable, superContrib):
  combined = taxable + superContrib
  if combined <= 250000: return 0
  return min(combined - 250000, superContrib) * 0.15
```

Extra 15% on the part of concessional super contributions that pushes combined
income over $250k, capped at the contribution.

### 2.4 Super constants (ATO-confirmed 16 May 2026)

- Current-year concessional cap: **$30,000**
- Carry-forward available: **$122,610**
- Total concessional cap available FY25-26: **$152,610**
- Division 293 threshold: **$250,000**

### 2.5 Loan repayment (standard amortised P&I)

```
calcMonthlyRepayment(P, ratePct, years):
  r = ratePct / 100 / 12
  n = years * 12
  return P * r * (1+r)^n / ((1+r)^n - 1)
```

Example: $735,000 at 6.5% over 30 years -> **$4,646/month**. ($637,000 -> $4,026/month.)

---

## 3. Scenarios tab - the engine

### 3.1 Inputs and defaults

**Shared inputs (one set, applied to all three scenarios):**

| Input | Default | Notes |
|---|---|---|
| Trust net profit (FY25-26) | $320,000 | accrual estimate; $308,301 actual YTD to 9 Jun (QuickBooks) |
| Personal cash on hand | $10,000 | |
| Business bank (30 Jun projected) | $140,000 | 9 Jun actual $120,095 |
| Min business buffer | $30,000 | cash retained in business, not usable for deposit |
| Revenue Jul / Aug / Sep / Oct | $25,000 each | conservative; actuals run $27-33k/mo |
| Monthly outgoings | $13,000 | business ~$7k + living + tax set-aside |
| Interest rate | 6.5% | |
| Loan term | 30 years | |
| Other purchase costs | $7,000 | conveyancing etc. |

**Per-scenario inputs:** property target ($650k/$700k/$750k), super contribution
(default $80,000), bucket company (default $0), prepaid expenses (default $22,500).

Constant: **LVR_FHG = 0.98** (loan = 98% of price; deposit = 2%).

### 3.2 The full calculation (per scenario)

```
# --- Property ---
loan            = propertyTarget * 0.98
deposit         = propertyTarget * 0.02
stampDuty       = calcStampDuty(propertyTarget)
cashNeeded      = deposit + stampDuty + otherCosts
monthlyRepayment= calcMonthlyRepayment(loan, interestRate, loanYears)

# --- Tax ---
adjustedProfit  = max(0, trustProfit - prepaid)        # prepay is deductible
personalDist    = max(0, adjustedProfit - bucket)      # bucket distribution removed from personal
personalTaxable = max(0, personalDist - superContrib)  # concessional super removed
personal        = calcPersonalTax(personalTaxable)
superTax        = superContrib * 0.15
div293          = calcDiv293(personalTaxable, superContrib)
bucketTax       = bucket * 0.25
totalTax        = personal.total + superTax + div293 + bucketTax
baseline        = calcPersonalTax(trustProfit)         # all profit taxed personally
taxSaved        = baseline.total - totalTax

# --- Cash flow at 30 June ---
superDrawFromBusiness   = max(0, superContrib - personalCash)   # super funded personal-first
personalCashUsedForSuper= min(superContrib, personalCash)
businessBankEnd         = businessBank - prepaid - superDrawFromBusiness   # NB: bucket NOT subtracted
personalCashEnd         = personalCash - personalCashUsedForSuper
totalCashAt30June       = businessBankEnd + personalCashEnd

# --- Cash to settlement ---
totalRevenueForecast    = revenueJul + revenueAug + revenueSep + revenueOct
totalOutgoingsForecast  = monthlyOutgoings * 4
cashGrowthToSettle      = totalRevenueForecast - totalOutgoingsForecast   # may be negative
totalCashAtSettlement   = totalCashAt30June + cashGrowthToSettle

# --- Surplus / deficit (must also retain the buffer) ---
cashAvailableForPurchase= totalCashAtSettlement - minBuffer
surplus                 = cashAvailableForPurchase - cashNeeded

# --- Offset (optional display) ---
offsetBalance           = max(0, surplus)
monthlyInterestSaved    = offsetBalance * (interestRate/100) / 12

# --- Status ---
bufferOk30June  = businessBankEnd >= minBuffer
canAffordPurchase = surplus >= 0
superExceeded   = superContrib > 152610
```

### 3.3 Worked example - Target ($750k), all defaults

```
Property:
  loan            = 750000 * 0.98          = 735,000
  deposit         = 750000 * 0.02          =  15,000
  stampDuty       = calcStampDuty(750000)  =  40,070
  cashNeeded      = 15000 + 40070 + 7000   =  62,070
  monthlyRepayment= calc(735000,6.5,30)    =   4,646/mo

Tax:
  adjustedProfit  = 320000 - 22500         = 297,500
  personalDist    = 297500 - 0             = 297,500
  personalTaxable = 297500 - 80000         = 217,500
  personal tax    = 26800*.16 + 90000*.30 + 55000*.37 + 27500*.45
                  = 4288 + 27000 + 20350 + 12375 = 64,013
  medicare        = 217500 * .02           =   4,350
  personal.total  =                          68,363
  superTax        = 80000 * .15            =  12,000
  div293          = min(297500-250000, 80000)*.15 = 47500*.15 = 7,125
  bucketTax       = 0
  totalTax        = 68363 + 12000 + 7125   =  87,488
  baseline.total  = calcPersonalTax(320000)= 116,538
  taxSaved        = 116538 - 87488         =  29,050

Cash flow:
  superDrawFromBusiness = max(0, 80000-10000) = 70,000
  businessBankEnd = 140000 - 22500 - 70000 =  47,500
  personalCashEnd = 10000 - 10000          =       0
  totalCashAt30June =                         47,500
  totalRevenueForecast = 25000*4           = 100,000
  totalOutgoingsForecast = 13000*4         =  52,000
  cashGrowthToSettle = 100000 - 52000      =  48,000
  totalCashAtSettlement = 47500 + 48000    =  95,500
  cashAvailableForPurchase = 95500 - 30000 =  65,500
  surplus = 65500 - 62070                  =  +3,430   -> AFFORDABLE
  offset interest saved = 3430*.065/12     =  ~$19/mo
```

(For reference: $650k surplus +$11,430; $700k +$7,430; $750k +$3,430 - all three
affordable at defaults.)

### 3.4 Key modelling decisions / assumptions (Scenarios tab)

1. **Personal income tax is NOT deducted from the deposit cash flow.** It is
   assumed already covered by PAYG instalments paid through the year, so the cash
   position reflects business bank + personal cash + net revenue only. *(This is the
   biggest structural assumption - see scrutiny list.)*
2. **Trust profit ($320k) is tracked separately from cash balances** (business bank
   $140k + personal cash $10k). The tax engine uses profit; the cash engine uses bank
   balances. They are not reconciled. *(Potential profit-vs-cash conflation.)*
3. **Bucket distribution is NOT subtracted from settlement cash** - see 3.5.
4. **Super is funded personal-cash-first, then topped up from the business.**
5. **Prepaid expenses reduce taxable trust profit and are paid from the business bank.**
6. **Revenue is netted to cash:** `net = sum(Jul..Oct revenue) - monthlyOutgoings*4`.
   Default $100k - $52k = $48k. Outgoings ($13k/mo) is a single catch-all for
   business costs + living + tax set-aside.
7. **Super contributions taxed at a flat 15% + Div 293.** The contribution slider's
   maximum is the $152,610 cap, but the engine does **not** split concessional vs
   non-concessional, nor model the contribution as a deduction inside this tab.
8. **Bucket company taxed at a flat 25%.** *(Likely 30% in reality - see section 5.)*
9. **"Tax saved vs baseline"** compares to the counterfactual of the entire trust
   profit taxed at personal marginal rates. It is a single-year figure and does
   **not** net off future top-up tax on bucketed or super'd money.

### 3.5 Bucket company - why it is modelled as tax-timing only

Earlier I (wrongly) subtracted the bucket distribution from settlement cash. The
user's actual plan: distribute to the bucket in **June** (FY25-26, to cut this
year's personal tax), then draw it back out in **July** (FY26-27, lower-income
year) - **before** the October settlement. Because the money round-trips back
before settlement, it remains available for the deposit, so it should **not** reduce
settlement cash. The bucket therefore moves only the **tax** breakdown (lower
personal taxable, +25% company tax, changed "tax saved"), not surplus.

Consistency argument used: the model already excludes personal income tax from the
cash flow (PAYG assumption), so to be consistent the bucket's tax is likewise not a
cash-flow item. **This is a deliberate simplification and a candidate for review:**
in reality the 25% company tax is a real cash outflow in June, and the July
drawdown carries top-up tax - both ignored here.

### 3.6 Expense accordion (data, not formula)

- **Already incurred (FY25-26): $87,321.68** across 22 categories, taken directly
  from the QuickBooks accrual P&L (as at 9 Jun 2026). **Data-integrity note:** the
  contractor line is the full account total **$27,104.00** (= $15,212.32 direct +
  itemised $11,891.68: design $676.56, digital advertising $2,250, website dev
  $8,965.12). An earlier secondhand read had missed the $15,212.32 parent posting;
  the corrected 22 categories now reconcile exactly to $87,321.68.
- **Prepayable before 30 June: $18,560** (user-editable). Original list was $24,737;
  the two already-purchased items (MacBook $5,200, UpDown desk $977) were removed as
  sunk costs. Remaining: SaaS subs $6,000, hosting $5,000, Freshwater tax $3,500,
  Google Workspace $2,000, AAMI $1,300, mobile/internet $760.

### 3.7 Offset toggle

When on, for any scenario with positive surplus:
```
offsetBalance        = surplus
monthlyInterestSaved = surplus * (loanRate/100) / 12       # e.g. 11,430 * 6.5%/12 = ~$62/mo
offsetNetLoan        = loan - surplus                       # interest charged on this
```
The contracted repayment is unchanged (still the full FHG loan); the offset just
reduces interest and keeps the cash accessible. Framed as superior to tipping the
surplus into the deposit (which would lock it in equity and lose the FHG 98%
structure for the same interest benefit).

---

## 4. Offset vs Super tab

Horizon = 30 years. **Annual** compounding. **Nominal** dollars (no inflation
adjustment). Default lump = $100,000.

### 4.1 Passive comparison

```
offsetStart = lumpSum
superStart  = lumpSum * (1 - superContribTaxPct/100)
offset(t)   = offsetStart * (1 + offsetRatePct/100)^t
super(t)    = superStart  * (1 + superRatePct/100)^t
crossover   = first t in [0..30] where super(t) >= offset(t)
```

Defaults: lump $100k, offset 6%, super 9%, contributions tax 15%.
- offsetStart = $100,000; superStart = $85,000.
- **Crossover at year 6.** (year 5: super $130,783 < offset $133,823; year 6: super
  $142,554 > offset $141,852.)
- **Year 30: offset $574,349, super $1,127,753, super ahead by ~$553,404.**

### 4.2 Sequencing comparison ("super now" vs "home first")

The user's real situation: he will pay the loan off fast (7-10 years) then build
super hard. So the question for the $100k is timing. **Only the lump's fate is
tracked** - the rest of the repayment plan is identical between strategies, so the
loan balance cancels.

```
superNowStart = lumpSum * (1 - superContribTaxPct/100)
superNow(t)   = superNowStart * (1 + superRatePct/100)^t       # locked in super from t=0
homeFirst(t)  = t <= T : lumpSum * (1 + loanRatePct/100)^t      # pays down loan (tax-free loan-rate return), accessible
                t >  T : lumpSum * (1 + loanRatePct/100)^T * (1 + superRatePct/100)^(t-T)   # redirected to super at payoff T
crossover     = first t where superNow(t) >= homeFirst(t)
```

Where **T = payoff year** (direct input, default 8). The "home first" path treats
paying down a 6% loan as a guaranteed, tax-free, compounding 6% return until the
loan clears, then switches the money into super (as an **after-tax / non-concessional**
contribution, i.e. no further entry tax) growing at the super rate.

Defaults: lump $100k, loan 6%, super 9%, tax 15%, T = 8.
- superNowStart = $85,000; homeFirst starts at $100,000.
- **Crossover at year 6** (identical to passive up to payoff, since "home first" earns
  the loan rate = offset rate pre-payoff).
- Milestones (superNow vs homeFirst):
  - Year 10: $201,226 vs $189,367 -> super +$11,859
  - Year 20: $476,375 vs $448,295 -> super +$28,080
  - **Year 30: $1,127,753 vs $1,061,275 -> super +$66,478**
- **At 30% contributions tax (Div 293): crossover disappears - "home first" wins**
  (superNow $928,742 vs homeFirst $1,061,275 at year 30).

**Why the gap is small vs the passive chart:** in the passive model "offset" stays
at 6% forever (super leads by $553k). In sequencing, "home first" switches to 9%
after payoff, so both paths end up compounding in super at 9% - the only real
difference is super-now's ~8-year head start vs the 15% entry tax it pays, which
nearly cancel (down to ~$66k on a $100k decision).

### 4.3 Liquidity marker

- Input "years until super unlocks" (default **25** - the user is 39 and is hedging
  that the preservation age, currently 60, rises over time; strict current law would
  be ~21 years).
- The passive chart shades the locked years and notes any crossover inside them is a
  "paper lead you cannot spend yet". Offset / home equity is accessible throughout.

### 4.4 Assumptions to scrutinise (Offset vs Super)

1. **Offset modelled as a compounding investment at the loan rate, tax-free.** Treats
   $1 in offset as earning the loan rate with annual compounding. Reasonable as an
   equivalent-return framing, but a real offset's "return" is avoided interest, not a
   reinvested cash balance unless savings are recycled.
2. **Super growth (9%) is assumed net of fees and earnings tax.** No separate 15%
   accumulation-phase earnings tax is applied (it's folded into the 9%).
3. **Contributions tax default 15%, and the ~47% concessional deduction is NOT
   modelled.** This *understates* super materially for concessional contributions
   (the deduction returns roughly the marginal rate as cash). Flagged in the UI.
4. **The $30,000 concessional cap is ignored** in these projections - you cannot put
   $100k in concessionally in one year (only $30k, rest non-concessional with
   different tax treatment). Flagged in the UI.
5. **"Home first" later super contribution assumed non-concessional (no entry tax)**,
   while "super now" pays the 15% entry tax. This asymmetry is deliberate (you'd
   contribute after-tax cash post-payoff) but is worth challenging.
6. **Constant rates for 30 years; no inflation; no sequencing/return risk.** The
   offset return is genuinely certain (= your loan rate); the 9% super figure is a
   long-run average treated as deterministic.
7. **Both strategies ultimately lock the money in super;** the liquidity advantage of
   "home first" is timing (accessible in the home until payoff).

---

## 5. Tax/legal context surfaced (not modelled, but flagged to the user)

- **Bucket company rate is likely 30%, not 25%.** A corporate beneficiary whose only
  income is a trust distribution may not be a "base rate entity", so 30% may apply.
- **Section 100A (reimbursement agreements)** is a live ATO risk for distributing to a
  low-taxed bucket while the benefit flows back to the individual; a fast in-June /
  out-in-July round-trip is the kind of pattern that attracts scrutiny. Proper
  documentation, a real franked dividend (not an informal withdrawal), and Division 7A
  compliance (UPE paid or on a complying loan) are required.
- **Confirmed: a 30% minimum tax on discretionary trusts from 1 July 2028** (2026-27
  Budget), with corporate beneficiaries NOT receiving credit for the trustee-level tax
  - widely described as the likely end of bucket-company strategies. No grandfathering.
  This is the user's "2028 anti-bucket" concern, and it checks out.

---

## 6. Things deliberately NOT done

- No FHB stamp-duty concession (user owned prior property).
- No bucket-company *cash* impact on settlement (treated as tax-timing only).
- No modelling of the concessional deduction or contribution caps inside the
  projections (flagged as caveats).
- No inflation adjustment; nominal dollars throughout.
- Personal income tax kept out of the settlement cash flow (PAYG assumption).

---

## 7. Specific questions for the reviewer

1. Is the **PAYG / personal-tax-excluded-from-cash-flow** assumption defensible for a
   settlement-cash model, or does it distort the surplus?
2. Is the **bucket-as-tax-timing-only** treatment (no cash impact, given the
   June-in/July-out round-trip) sound? Should the 25% (or 30%) company tax appear as a
   real cash outflow?
3. In the sequencing model, is it fair that **"super now" pays 15% entry tax but
   "home first" later contributes non-concessionally (0% entry)**? Should both be on
   the same footing?
4. Does treating **offset/loan-paydown as a compounding loan-rate return** overstate
   it vs simple interest avoided?
5. Is **9% net-of-everything** a fair super figure, and should accumulation-phase
   earnings tax be separated out?
6. The big omission: the **concessional deduction (~47%)** and the **$30k cap**. How
   much do these change the offset-vs-super conclusion if modelled properly?
7. Any bracket/Medicare/Div 293 errors in the FY25-26 tax engine (section 2)?

---

*Generated for independent review. Not financial advice. The user has an accountant
(Sarah) and broker (Simon) for the actual decisions; this tool is a planning aid.*
