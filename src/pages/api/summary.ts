import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_TARGETS } from '../../lib/categories';

export const GET: APIRoute = async ({ url }) => {
  const month = url.searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Response(JSON.stringify({ success: false, error: 'month parameter required (YYYY-MM)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDB();

    // Get category totals using category_override where set
    const result = await db.prepare(
      `SELECT COALESCE(category_override, category) as effective_category,
              SUM(amount) as total,
              COUNT(*) as count
       FROM transactions
       WHERE month_key = ? AND amount < 0
       GROUP BY effective_category
       ORDER BY total ASC`
    ).bind(month).all();

    // Get date range for projection
    const dateRange = await db.prepare(
      `SELECT MIN(CAST(SUBSTR(date, 9, 2) AS INTEGER)) as min_day,
              MAX(CAST(SUBSTR(date, 9, 2) AS INTEGER)) as max_day
       FROM transactions
       WHERE month_key = ?`
    ).bind(month).all();

    // Calculate days in month
    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const maxDay = (dateRange.results[0] as Record<string, unknown>)?.max_day as number || daysInMonth;

    // Fetch recurring expenses for hybrid projection
    interface RecurringItem { pattern: string; monthlyEq: number }
    let recurringByCategory: Record<string, RecurringItem[]> = {};
    try {
      const recurringResult = await db.prepare(
        `SELECT category, amount, frequency, match_pattern FROM recurring_expenses WHERE active = 1`
      ).all();
      for (const row of recurringResult.results as Record<string, unknown>[]) {
        const cat = row.category as string;
        const amount = row.amount as number;
        const freq = row.frequency as string;
        const monthlyEq = freq === 'fortnightly' ? amount * 26 / 12
          : freq === 'quarterly' ? amount / 3
          : amount;
        if (!recurringByCategory[cat]) {
          recurringByCategory[cat] = [];
        }
        recurringByCategory[cat].push({ pattern: row.match_pattern as string, monthlyEq });
      }
    } catch {
      // Table may not exist yet; fall back to linear projection
      recurringByCategory = {};
    }

    // Fetch all transactions for matching recurring expenses
    let allTxns: Record<string, unknown>[] = [];
    if (Object.keys(recurringByCategory).length > 0) {
      const txnResult = await db.prepare(
        `SELECT description, amount, COALESCE(category_override, category) as effective_category
         FROM transactions WHERE month_key = ? AND amount < 0`
      ).bind(month).all();
      allTxns = txnResult.results as Record<string, unknown>[];
    }

    const categories = (result.results as Record<string, unknown>[]).map((row) => {
      const catId = row.effective_category as string;
      const actual = Math.abs(row.total as number);
      const target = CATEGORY_TARGETS[catId] ?? null;

      let projected: number;
      const recurringItems = recurringByCategory[catId];

      if (recurringItems && recurringItems.length > 0 && maxDay < daysInMonth) {
        // Hybrid projection: separate recurring from variable spending
        const catTxns = allTxns.filter((t) => t.effective_category === catId);
        let matchedRecurring = 0;
        let unmatchedExpected = 0;

        for (const item of recurringItems) {
          const patternLower = item.pattern.toLowerCase();
          const matched = catTxns.filter((t) =>
            (t.description as string).toLowerCase().includes(patternLower)
          );
          if (matched.length > 0) {
            matchedRecurring += matched.reduce((sum, t) => sum + Math.abs(t.amount as number), 0);
          } else {
            unmatchedExpected += item.monthlyEq;
          }
        }

        const variableActual = Math.max(0, actual - matchedRecurring);
        const variableProjected = variableActual * daysInMonth / maxDay;
        projected = matchedRecurring + unmatchedExpected + variableProjected;
      } else {
        // Full month data or no recurring info: use linear projection
        projected = maxDay < daysInMonth ? actual * daysInMonth / maxDay : actual;
      }

      return {
        id: catId,
        label: CATEGORY_LABELS[catId] ?? catId,
        color: CATEGORY_COLORS[catId] ?? '#9ca3af',
        actual: Math.round(actual * 100) / 100,
        projected: Math.round(projected * 100) / 100,
        target,
        count: row.count as number,
        over_target: target !== null && projected > target,
      };
    });

    // Get income total
    const incomeResult = await db.prepare(
      `SELECT SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE month_key = ? AND amount > 0`
    ).bind(month).all();

    const incomeRow = incomeResult.results[0] as Record<string, unknown> | undefined;
    const incomeTotal = (incomeRow?.total as number) || 0;

    // HEM benchmark: living expenses excluding rent
    const hemBenchmark = 3100;
    const actualLivingExpenses = Math.round(
      categories
        .filter((c) => c.id !== 'rent')
        .reduce((sum, c) => sum + c.actual, 0) * 100
    ) / 100;
    const hemGap = Math.round((actualLivingExpenses - hemBenchmark) * 100) / 100;

    return new Response(JSON.stringify({
      success: true,
      data: {
        month,
        days_in_month: daysInMonth,
        max_transaction_day: maxDay,
        categories,
        income: {
          total: Math.round(incomeTotal * 100) / 100,
          count: (incomeRow?.count as number) || 0,
        },
        hem_benchmark: hemBenchmark,
        hem_household_type: 'Single parent, 2 dependants, regional Victoria',
        actual_living_expenses: actualLivingExpenses,
        expenses_vs_hem: actualLivingExpenses > hemBenchmark ? 'above' : 'below',
        hem_gap: hemGap,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch summary',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
