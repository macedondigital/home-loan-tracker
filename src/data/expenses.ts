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

// FY25-26 operating expenses by category, from the 29 June accrual P&L. Total:
// $125,532.22 (the "Total for Expenses" line; excludes $550.89 SEO cost of sales
// and -$1.16 BAS roundoff). "Contractor expenses" is the full account total:
// $15,212.32 direct + $15,891.68 itemised (design $676.56, digital advertising
// $2,250, website development $12,965.12). Up ~$22.6k since 21 June as late-June
// EOFY spending booked (website development, computer/IT, software, subscriptions).
export const INCURRED_EXPENSES: IncurredExpense[] = [
  { category: 'Contractor expenses (non-salary)', amount: 31104.0 },
  { category: 'Superannuation expense', amount: 11385.0 },
  { category: 'Website hosting', amount: 11856.26 },
  { category: 'Subscriptions', amount: 10816.32 },
  { category: 'Accounting and bookkeeping', amount: 10097.45 },
  { category: 'Motor vehicle expenses', amount: 7418.95 },
  { category: 'Office rent', amount: 7169.64 },
  { category: 'Computer & IT equipment', amount: 4726.36 },
  { category: 'Advertising and marketing', amount: 4597.4 },
  { category: 'Fuel and oils', amount: 3559.82 },
  { category: 'PayPal fees', amount: 3052.32 },
  { category: 'Office expenses', amount: 3021.93 },
  { category: 'Software expense', amount: 2991.46 },
  { category: 'Stripe fees', amount: 2854.21 },
  { category: 'Website design', amount: 2530.62 },
  { category: 'Professional fees', amount: 1879.0 },
  { category: 'Insurance', amount: 1242.47 },
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
// and persisted to localStorage. This is ONLY what is still outstanding with one
// operating day left before 30 June - bring-forwards already paid are now in
// INCURRED_EXPENSES, so listing them here would double-count. Total: $7,000.
//
// Already actioned (now in the 29 June P&L, not repeated here): Scala hosting
// $4,299.84 + Synergy $2,500 (Website hosting), Freshwater $2,500 (Accounting),
// Anthropic, Zoom, 1Password (Subscriptions), Launtel internet, DataforSEO
// $2,253.64, BlogVault/MalCare $2,120.62, plus the $60,000 concessional super
// contribution to Hostplus (24 June; a personal deduction, not a company
// expense). Google Workspace is billed monthly (already in the P&L), not an
// annual prepay. MacBook and desk remain excluded as capital/sunk costs.
export const DEFAULT_PREPAYABLES: PrepayableItem[] = [
  { id: 'bookkeeping', item: 'Bookkeeping (final FY invoice)', amount: 5000 },
  { id: 'bizcover', item: 'BizCover insurance renewal', amount: 2000 },
];

export const sumExpenses = (rows: { amount: number }[]): number =>
  rows.reduce((total, row) => total + row.amount, 0);
