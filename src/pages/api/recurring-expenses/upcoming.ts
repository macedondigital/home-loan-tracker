import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../../../lib/categories';

interface RecurringExpense {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  day_of_month: number | null;
  category: string;
  match_pattern: string;
  active: number;
}

interface Transaction {
  description: string;
  amount: number;
  date: string;
}

function getMonthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'fortnightly':
      return Math.round(amount * 26 / 12 * 100) / 100;
    case 'quarterly':
      return Math.round(amount / 3 * 100) / 100;
    default:
      return amount;
  }
}

export const GET: APIRoute = async ({ url }) => {
  const now = new Date();
  const month = url.searchParams.get('month') ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid month format (YYYY-MM)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDB();

    // Fetch all active recurring expenses
    const expensesResult = await db.prepare(
      `SELECT id, name, amount, frequency, day_of_month, category, match_pattern, active
       FROM recurring_expenses
       WHERE active = 1
       ORDER BY amount DESC`
    ).all();

    const expenses = expensesResult.results as unknown as RecurringExpense[];

    // Fetch all transactions for the month
    const txnResult = await db.prepare(
      `SELECT description, amount, date FROM transactions WHERE month_key = ? AND amount < 0`
    ).bind(month).all();

    const transactions = txnResult.results as unknown as Transaction[];

    // Match each expense against transactions
    const expenseDetails = expenses.map((exp) => {
      const pattern = exp.match_pattern.toLowerCase();
      const matched = transactions.filter((txn) =>
        txn.description.toLowerCase().includes(pattern)
      );
      const matchedAmount = matched.reduce((sum, txn) => sum + Math.abs(txn.amount), 0);
      const matchedDate = matched.length > 0
        ? matched.reduce((latest, txn) => txn.date > latest ? txn.date : latest, matched[0].date)
        : null;

      return {
        id: exp.id,
        name: exp.name,
        amount: exp.amount,
        frequency: exp.frequency,
        day_of_month: exp.day_of_month,
        category: exp.category,
        category_label: CATEGORY_LABELS[exp.category] ?? exp.category,
        category_color: CATEGORY_COLORS[exp.category] ?? '#9ca3af',
        monthly_equivalent: getMonthlyEquivalent(exp.amount, exp.frequency),
        matched: matched.length > 0,
        matched_amount: Math.round(matchedAmount * 100) / 100,
        matched_date: matchedDate,
      };
    });

    const totalExpected = expenseDetails.reduce((sum, e) => sum + e.monthly_equivalent, 0);
    const totalMatched = expenseDetails.filter((e) => e.matched).reduce((sum, e) => sum + e.matched_amount, 0);
    const totalUpcoming = expenseDetails.filter((e) => !e.matched).reduce((sum, e) => sum + e.monthly_equivalent, 0);

    return new Response(JSON.stringify({
      success: true,
      data: {
        month,
        expenses: expenseDetails,
        total_expected: Math.round(totalExpected * 100) / 100,
        total_matched: Math.round(totalMatched * 100) / 100,
        total_upcoming: Math.round(totalUpcoming * 100) / 100,
        matched_count: expenseDetails.filter((e) => e.matched).length,
        total_count: expenseDetails.length,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch upcoming expenses',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
