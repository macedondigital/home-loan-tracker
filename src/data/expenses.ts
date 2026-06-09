// Expense reference data for the Scenarios tab accordion.
//
// INCURRED figures come from the Macedon Digital FY25-26 QuickBooks P&L
// (accrual basis), as at 9 June 2026. PREPAYABLE figures are the confirmed
// bring-forward list from the planning brief: deductible costs that can be
// paid before 30 June to reduce this year's trust profit.
//
// These are static reference numbers, not live data. Update the snapshot date
// and figures when a newer P&L is available.

export const INCURRED_AS_AT = '9 June 2026';

export interface IncurredExpense {
  category: string;
  amount: number;
}

// FY25-26 operating expenses by category, from the accrual P&L. Total:
// $87,321.68 (excludes $550.89 SEO cost of sales). "Contractor expenses" is the
// full account total: $15,212.32 direct + $11,891.68 itemised (design $676.56,
// digital advertising $2,250, website development $8,965.12).
export const INCURRED_EXPENSES: IncurredExpense[] = [
  { category: 'Contractor expenses (non-salary)', amount: 27104.0 },
  { category: 'Superannuation expense', amount: 10350.0 },
  { category: 'Office rent', amount: 7169.64 },
  { category: 'Motor vehicle expenses', amount: 6925.95 },
  { category: 'Subscriptions', amount: 4908.35 },
  { category: 'Advertising and marketing', amount: 4581.95 },
  { category: 'Website hosting', amount: 3549.29 },
  { category: 'Office expenses', amount: 2941.03 },
  { category: 'PayPal fees', amount: 2919.89 },
  { category: 'Fuel and oils', amount: 2728.83 },
  { category: 'Stripe fees', amount: 2693.29 },
  { category: 'Accounting and bookkeeping', amount: 2622.72 },
  { category: 'Website design', amount: 2530.62 },
  { category: 'Insurance', amount: 1242.47 },
  { category: 'Filing fees', amount: 1148.0 },
  { category: 'Software expense', amount: 870.84 },
  { category: 'Bank charges and fees', amount: 653.33 },
  { category: 'Travel expenses', amount: 652.56 },
  { category: 'Meals and entertainment', amount: 634.51 },
  { category: 'Telephone and internet', amount: 634.44 },
  { category: 'AI software', amount: 357.97 },
  { category: 'Fines', amount: 102.0 },
];

export type PrepayableStatus = 'incurred' | 'planned';

export interface PrepayableExpense {
  item: string;
  amount: number;
  status: PrepayableStatus;
  note?: string;
}

// Confirmed prepayable / bring-forward items. Total: $24,737.
// MacBook and UpDown desk were already purchased in June 2026, so they are
// "incurred" rather than still "planned".
export const PREPAYABLE_EXPENSES: PrepayableExpense[] = [
  { item: 'SaaS subscriptions (annualised)', amount: 6000.0, status: 'planned' },
  { item: 'Hosting (Scala + Synergy)', amount: 5000.0, status: 'planned' },
  { item: 'MacBook', amount: 5200.0, status: 'incurred', note: 'purchased June 2026' },
  { item: 'Freshwater Taxation (next year)', amount: 3500.0, status: 'planned' },
  { item: 'Google Workspace (annual)', amount: 2000.0, status: 'planned' },
  { item: 'AAMI insurance renewal', amount: 1300.0, status: 'planned' },
  { item: 'UpDown desk', amount: 977.0, status: 'incurred', note: 'purchased June 2026' },
  { item: 'Mobile / internet (Woolworths + Zintel)', amount: 760.0, status: 'planned' },
];

export const sumExpenses = (rows: { amount: number }[]): number =>
  rows.reduce((total, row) => total + row.amount, 0);
