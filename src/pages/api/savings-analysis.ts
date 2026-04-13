import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();

    // Get the last 3 complete months
    const monthsResult = await db.prepare(
      `SELECT DISTINCT month_key FROM transactions ORDER BY month_key DESC LIMIT 4`
    ).all();

    const monthKeys = (monthsResult.results as { month_key: string }[]).map((r) => r.month_key);

    // Current month may be incomplete, use the 3 most recent complete months
    // If we have 4 months, skip the first (current/incomplete). If 3 or fewer, use all.
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const analysisMonths = monthKeys.filter((m) => m < currentMonth).slice(0, 3);

    if (analysisMonths.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          net_monthly_savings: 0,
          balance_change_raw: 0,
          balance_change_adjusted: 0,
          excluded_outflows: [],
          total_excluded: 0,
          months_analysed: 0,
          genuine_savings_trend: 'flat' as const,
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const placeholders = analysisMonths.map(() => '?').join(',');

    // Get all transactions in the window
    const txnResult = await db.prepare(
      `SELECT date, description, amount, category, category_override, month_key
       FROM transactions
       WHERE month_key IN (${placeholders})
       ORDER BY date ASC`
    ).bind(...analysisMonths).all();

    const transactions = txnResult.results as Array<{
      date: string;
      description: string;
      amount: number;
      category: string;
      category_override: string | null;
      month_key: string;
    }>;

    // Identify large one-off outflows (> $5,000 single transaction)
    const excludedOutflows: Array<{ description: string; amount: number; date: string }> = [];
    let totalIncome = 0;
    let totalRegularExpenses = 0;

    for (const txn of transactions) {
      const cat = txn.category_override || txn.category;
      if (cat === 'income' || txn.amount > 0) {
        totalIncome += txn.amount;
      } else if (txn.amount < -5000) {
        excludedOutflows.push({ description: txn.description, amount: txn.amount, date: txn.date });
      } else {
        totalRegularExpenses += Math.abs(txn.amount);
      }
    }

    const monthsCounted = analysisMonths.length;
    const totalExcluded = excludedOutflows.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const netMonthlySavings = Math.round((totalIncome - totalRegularExpenses) / monthsCounted);

    // Balance history
    const balanceResult = await db.prepare(
      `SELECT bank_australia, nab_business, recorded_at FROM bank_balances ORDER BY recorded_at ASC`
    ).all();

    const balances = balanceResult.results as Array<{
      bank_australia: number;
      nab_business: number;
      recorded_at: string;
    }>;

    let balanceChangeRaw = 0;
    let balanceChangeAdjusted = 0;

    if (balances.length >= 2) {
      const earliest = balances[0];
      const latest = balances[balances.length - 1];
      const earliestCombined = earliest.bank_australia + earliest.nab_business;
      const latestCombined = latest.bank_australia + latest.nab_business;
      balanceChangeRaw = Math.round(latestCombined - earliestCombined);
      balanceChangeAdjusted = Math.round(balanceChangeRaw + totalExcluded);
    }

    const genuineSavingsTrend: 'positive' | 'flat' | 'negative' =
      netMonthlySavings > 200 ? 'positive' :
      netMonthlySavings >= -200 ? 'flat' : 'negative';

    return new Response(JSON.stringify({
      success: true,
      data: {
        net_monthly_savings: netMonthlySavings,
        balance_change_raw: balanceChangeRaw,
        balance_change_adjusted: balanceChangeAdjusted,
        excluded_outflows: excludedOutflows,
        total_excluded: totalExcluded,
        months_analysed: monthsCounted,
        genuine_savings_trend: genuineSavingsTrend,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compute savings analysis',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
