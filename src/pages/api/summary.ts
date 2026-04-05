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

    const categories = (result.results as Record<string, unknown>[]).map((row) => {
      const catId = row.effective_category as string;
      const actual = Math.abs(row.total as number);
      const projected = maxDay < daysInMonth ? actual * daysInMonth / maxDay : actual;
      const target = CATEGORY_TARGETS[catId] ?? null;

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
