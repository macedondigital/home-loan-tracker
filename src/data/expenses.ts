// Expense reference data for the Scenarios tab accordion.
//
// INCURRED figures come from the Macedon Digital FY25-26 QuickBooks P&L
// (accrual basis), as at 21 June 2026. PREPAYABLE figures are the confirmed
// bring-forward list from the planning brief: deductible costs that can be
// paid before 30 June to reduce this year's trust profit.
//
// These are static reference numbers, not live data. Update the snapshot date
// and figures when a newer P&L is available.

export const INCURRED_AS_AT = '29 June 2026';

export interface IncurredExpense {
  category: string;
  amount: number;
}

// FY25-26 operating expenses by category. Total: $135,508.06 = the 29 June
// accrual P&L "Total for Expenses" line ($125,532.22) PLUS three deductible
// items paid late in June that the morning P&L had not yet booked:
//   - Bookkeeping $5,722.20 (MicroChilli via Ignition, 23 + 26 June; the bank
//     feed filed both as "Transfers out", so they were unbooked) -> Accounting
//   - DataforSEO $2,253.64 (28 June, FastSpring) -> Subscriptions
//   - BizCover insurance $2,000 (charged to Will's personal card; deductible
//     business cost, booked via the beneficiary loan) -> Insurance
// The P&L excludes $550.89 SEO cost of sales and -$1.16 BAS roundoff.
// "Contractor expenses" is the full account total: $15,212.32 direct + $15,891.68
// itemised (design $676.56, digital advertising $2,250, website development
// $12,965.12). Refresh from a new P&L export when the late items are reconciled.
export const INCURRED_EXPENSES: IncurredExpense[] = [
  { category: 'Contractor expenses (non-salary)', amount: 31104.0 },
  { category: 'Accounting and bookkeeping', amount: 15819.65 },
  { category: 'Subscriptions', amount: 13069.96 },
  { category: 'Website hosting', amount: 11856.26 },
  { category: 'Superannuation expense', amount: 11385.0 },
  { category: 'Motor vehicle expenses', amount: 7418.95 },
  { category: 'Office rent', amount: 7169.64 },
  { category: 'Computer & IT equipment', amount: 4726.36 },
  { category: 'Advertising and marketing', amount: 4597.4 },
  { category: 'Fuel and oils', amount: 3559.82 },
  { category: 'Insurance', amount: 3242.47 },
  { category: 'PayPal fees', amount: 3052.32 },
  { category: 'Office expenses', amount: 3021.93 },
  { category: 'Software expense', amount: 2991.46 },
  { category: 'Stripe fees', amount: 2854.21 },
  { category: 'Website design', amount: 2530.62 },
  { category: 'Professional fees', amount: 1879.0 },
  { category: 'Filing fees', amount: 1193.0 },
  { category: 'Bank charges and fees', amount: 938.22 },
  { category: 'Travel expenses', amount: 897.52 },
  { category: 'Telephone and internet', amount: 717.66 },
  { category: 'Meals and entertainment', amount: 634.51 },
  { category: 'Printing, stationery and supplies', amount: 388.13 },
  { category: 'AI software', amount: 357.97 },
  { category: 'Fines', amount: 102.0 },
];

export interface PrepayableItem {
  id: string;
  item: string;
  amount: number;
}

// Default prepayable / bring-forward items, editable by the user (add/remove)
// and persisted to localStorage. With one operating day left before 30 June this
// is ONLY what is still being considered but not yet paid - paid items are in
// INCURRED_EXPENSES, so listing them here would double-count. Total: $5,000.
//
// Already paid (now in INCURRED_EXPENSES, not repeated here): bookkeeping
// $5,722.20 (MicroChilli/Ignition), DataforSEO $2,253.64, BizCover insurance
// $2,000 (personal card), Scala hosting $4,299.84, Synergy $2,500, Freshwater
// $2,500, Anthropic/Zoom/1Password, Launtel, BlogVault/MalCare $2,120.62, plus
// the $60,000 concessional super contribution to Hostplus (24 June; a personal
// deduction, not a company expense). Google Workspace is billed monthly (already
// in the P&L). MacBook and desk remain excluded as capital/sunk costs.
//
// Google Ads is a planned-but-uncommitted ~$5k spend. It is listed here as a
// consideration; the scenario "prepay" lever stays at $0 until it is committed,
// at which point bump the lever to claim the deduction this year.
export const DEFAULT_PREPAYABLES: PrepayableItem[] = [
  { id: 'google-ads', item: 'Google Ads campaign (planned)', amount: 5000 },
];

export const sumExpenses = (rows: { amount: number }[]): number =>
  rows.reduce((total, row) => total + row.amount, 0);
