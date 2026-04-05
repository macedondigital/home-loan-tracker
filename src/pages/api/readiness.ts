import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

interface Criterion {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export const GET: APIRoute = async () => {
  try {
    const db = getDB();

    // Get milestones
    const milestones = await db.prepare(
      `SELECT id, completed FROM milestones`
    ).all();
    const milestoneMap = new Map(
      (milestones.results as Record<string, unknown>[]).map((m) => [m.id as string, m.completed as number])
    );

    // Get months with data
    const monthsResult = await db.prepare(
      `SELECT month_key, COUNT(*) as count FROM transactions GROUP BY month_key ORDER BY month_key DESC`
    ).all();
    const monthCount = monthsResult.results.length;

    // Get most recent full month's data
    const recentMonth = monthsResult.results.length > 0
      ? (monthsResult.results[0] as Record<string, unknown>).month_key as string
      : null;

    let uberEatsTotal = 0;
    let amazonTotal = 0;
    let childSupportTotal = 0;
    let hasBNPL = false;
    let hasGambling = false;

    if (recentMonth) {
      // Uber Eats in recent month
      const uberResult = await db.prepare(
        `SELECT SUM(ABS(amount)) as total FROM transactions
         WHERE month_key = ? AND COALESCE(category_override, category) = 'uber-eats'`
      ).bind(recentMonth).all();
      uberEatsTotal = ((uberResult.results[0] as Record<string, unknown>)?.total as number) || 0;

      // Amazon in recent month
      const amazonResult = await db.prepare(
        `SELECT SUM(ABS(amount)) as total FROM transactions
         WHERE month_key = ? AND COALESCE(category_override, category) = 'amazon'`
      ).bind(recentMonth).all();
      amazonTotal = ((amazonResult.results[0] as Record<string, unknown>)?.total as number) || 0;

      // Child support in recent month
      const csResult = await db.prepare(
        `SELECT SUM(ABS(amount)) as total FROM transactions
         WHERE month_key = ? AND COALESCE(category_override, category) = 'child-support'`
      ).bind(recentMonth).all();
      childSupportTotal = ((csResult.results[0] as Record<string, unknown>)?.total as number) || 0;

      // Check for BNPL
      const bnplResult = await db.prepare(
        `SELECT COUNT(*) as count FROM transactions
         WHERE month_key = ? AND (
           description LIKE '%afterpay%' OR description LIKE '%zip pay%'
           OR description LIKE '%humm%' OR description LIKE '%latitude%'
           OR description LIKE '%klarna%' OR description LIKE '%openpay%'
         )`
      ).bind(recentMonth).all();
      hasBNPL = ((bnplResult.results[0] as Record<string, unknown>)?.count as number) > 0;

      // Check for gambling
      const gamblingResult = await db.prepare(
        `SELECT COUNT(*) as count FROM transactions
         WHERE month_key = ? AND (
           description LIKE '%sportsbet%' OR description LIKE '%tab %'
           OR description LIKE '%bet365%' OR description LIKE '%ladbrokes%'
           OR description LIKE '%pokerstars%' OR description LIKE '%neds%'
           OR description LIKE '%pointsbet%' OR description LIKE '%unibet%'
         )`
      ).bind(recentMonth).all();
      hasGambling = ((gamblingResult.results[0] as Record<string, unknown>)?.count as number) > 0;
    }

    // Get latest balances
    const balanceResult = await db.prepare(
      `SELECT bank_australia, nab_business FROM bank_balances ORDER BY recorded_at DESC LIMIT 1`
    ).all();
    const balance = balanceResult.results[0] as Record<string, unknown> | undefined;
    const combined = balance
      ? (balance.bank_australia as number) + (balance.nab_business as number)
      : 0;

    const criteria: Criterion[] = [
      {
        id: 'ato-cleared',
        label: 'ATO debt fully cleared',
        pass: milestoneMap.get('pay-ato-overdue') === 1 && milestoneMap.get('pay-ato-assessment') === 1,
        detail: 'Both ATO payments completed',
      },
      {
        id: 'clean-banking',
        label: '3+ months of clean banking data',
        pass: monthCount >= 3,
        detail: `${monthCount} month${monthCount !== 1 ? 's' : ''} of data uploaded`,
      },
      {
        id: 'interim-pl',
        label: 'Interim P&L signed',
        pass: milestoneMap.get('interim-pl') === 1,
        detail: 'Accountant signed interim profit & loss',
      },
      {
        id: 'noas-ready',
        label: 'FY23 24 and FY24 25 NOAs ready',
        pass: milestoneMap.get('meet-accountant') === 1,
        detail: 'Accountant meeting completed, NOAs in progress',
      },
      {
        id: 'zero-uber',
        label: 'Zero Uber Eats (recent month)',
        pass: uberEatsTotal === 0,
        detail: uberEatsTotal === 0 ? 'No Uber Eats spending' : `$${uberEatsTotal.toFixed(2)} spent on Uber Eats`,
      },
      {
        id: 'amazon-target',
        label: 'Amazon under $100 (recent month)',
        pass: amazonTotal <= 100,
        detail: amazonTotal <= 100 ? `$${amazonTotal.toFixed(2)} spent` : `$${amazonTotal.toFixed(2)} spent (over $100 target)`,
      },
      {
        id: 'no-bnpl',
        label: 'No buy now pay later transactions',
        pass: !hasBNPL,
        detail: hasBNPL ? 'BNPL transactions detected' : 'No BNPL transactions found',
      },
      {
        id: 'no-gambling',
        label: 'No gambling transactions',
        pass: !hasGambling,
        detail: hasGambling ? 'Gambling transactions detected' : 'No gambling transactions found',
      },
      {
        id: 'child-support',
        label: 'Child support at agreement ($1,200 or less)',
        pass: childSupportTotal <= 1200,
        detail: childSupportTotal === 0 ? 'No payments recorded' : `$${childSupportTotal.toFixed(2)} paid`,
      },
      {
        id: 'cash-buffer',
        label: 'Cash buffer above $62,000',
        pass: combined >= 62000,
        detail: balance ? `Combined balance: $${combined.toLocaleString('en-AU')}` : 'No balances recorded',
      },
    ];

    const score = criteria.filter((c) => c.pass).length;

    return new Response(JSON.stringify({
      success: true,
      data: { score, total: 10, criteria },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate readiness',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
