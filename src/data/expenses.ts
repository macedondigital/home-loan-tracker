// Expense reference data for the Scenarios tab accordion.
//
// INCURRED figures come from the Macedon Digital FY25-26 QuickBooks P&L
// (accrual basis), as at 21 June 2026. PREPAYABLE figures are the confirmed
// bring-forward list from the planning brief: deductible costs that can be
// paid before 30 June to reduce this year's trust profit.
//
// These are static reference numbers, not live data. Update the snapshot date
// and figures when a newer P&L is available.

export const INCURRED_AS_AT = '21 June 2026';

export interface IncurredExpense {
  category: string;
  amount: number;
}

// FY25-26 operating expenses by category, from the accrual P&L. Total:
// $102,928.54 (excludes $550.89 SEO cost of sales and -$1.16 BAS roundoff).
// "Contractor expenses" is the full account total: $15,212.32 direct + $11,891.68
// itemised (design $676.56, digital advertising $2,250, website development
// $8,965.12). Jump since 9 Jun reflects FY-end prepays now booked: Subscriptions
// (Anthropic/Zoom/1Password), Website hosting (Scala), Accounting (Freshwater).
export const INCURRED_EXPENSES: IncurredExpense[] = [
  { category: 'Contractor expenses (non-salary)', amount: 27104.0 },
  { category: 'Superannuation expense', amount: 11385.0 },
  { category: 'Subscriptions', amount: 10345.88 },
  { category: 'Website hosting', amount: 7856.26 },
  { category: 'Motor vehicle expenses', amount: 7418.95 },
  { category: 'Office rent', amount: 7169.64 },
  { category: 'Accounting and bookkeeping', amount: 4895.45 },
  { category: 'Advertising and marketing', amount: 4597.4 },
  { category: 'Fuel and oils', amount: 3559.82 },
  { category: 'PayPal fees', amount: 3029.37 },
  { category: 'Office expenses', amount: 2964.66 },
  { category: 'Stripe fees', amount: 2806.48 },
  { category: 'Website design', amount: 2530.62 },
  { category: 'Insurance', amount: 1242.47 },
  { category: 'Filing fees', amount: 1193.0 },
  { category: 'Travel expenses', amount: 897.52 },
  { category: 'Software expense', amount: 870.84 },
  { category: 'Bank charges and fees', amount: 860.91 },
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
// and persisted to localStorage. This is ONLY what is still outstanding before
// 30 June - bring-forwards already paid in June are now in INCURRED_EXPENSES, so
// listing them here would double-count. Total: $8,300.
//
// Already actioned (now in the accrual P&L, not repeated here): Scala hosting
// $4,299.84 + Synergy $2,500 (Website hosting), Freshwater next-year $2,500
// (Accounting), Anthropic $2,170 + Zoom $256.55 + 1Password $102.06 annualised
// (Subscriptions), Launtel internet $3,000. MacBook and desk remain excluded as
// capital/sunk costs.
export const DEFAULT_PREPAYABLES: PrepayableItem[] = [
  { id: 'bookkeeping', item: 'Bookkeeping (final FY invoice)', amount: 5000 },
  { id: 'workspace', item: 'Google Workspace (annual)', amount: 2000 },
  { id: 'aami', item: 'AAMI insurance renewal', amount: 1300 },
];

export const sumExpenses = (rows: { amount: number }[]): number =>
  rows.reduce((total, row) => total + row.amount, 0);
