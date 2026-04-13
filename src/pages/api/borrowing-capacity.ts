import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();

    // 1. Income: try income_records assessment, fallback to $72K/year
    let monthlyIncome = 6000;
    let incomeSource: 'trust_assessment' | 'fallback_drawings' = 'fallback_drawings';
    let lenderAnnualIncome = 72000;

    const incomeResult = await db.prepare(
      `SELECT financial_year, trust_distribution, add_back_depreciation,
              add_back_super, add_back_one_off, add_back_other
       FROM income_records
       ORDER BY financial_year ASC`
    ).all();

    const records = incomeResult.results as Array<{
      financial_year: string;
      trust_distribution: number;
      add_back_depreciation: number;
      add_back_super: number;
      add_back_one_off: number;
      add_back_other: number;
    }>;

    const assessables: number[] = [];
    for (const r of records) {
      if (r.trust_distribution > 0) {
        assessables.push(r.trust_distribution + r.add_back_depreciation + r.add_back_super + r.add_back_one_off + r.add_back_other);
      }
    }

    if (assessables.length > 0) {
      lenderAnnualIncome = assessables.length >= 2 ? Math.min(...assessables) : assessables[0];
      monthlyIncome = Math.round(lenderAnnualIncome / 12);
      incomeSource = 'trust_assessment';
    }

    // 2. Expenses: latest month actual expenses
    const monthsResult = await db.prepare(
      `SELECT month_key FROM transactions GROUP BY month_key ORDER BY month_key DESC LIMIT 1`
    ).all();

    let actualMonthlyExpenses = 0;
    if (monthsResult.results.length > 0) {
      const latestMonth = (monthsResult.results[0] as { month_key: string }).month_key;
      const expResult = await db.prepare(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as total
         FROM transactions
         WHERE month_key = ? AND amount < 0`
      ).bind(latestMonth).all();
      if (expResult.results.length > 0) {
        actualMonthlyExpenses = Math.round((expResult.results[0] as { total: number }).total);
      }
    }

    // 3. HEM floor
    const hemBenchmark = 3100;
    const declaredExpenses = Math.max(actualMonthlyExpenses, hemBenchmark);

    // 4. Borrowing capacity calculation
    const monthlySurplus = monthlyIncome - declaredExpenses;
    const assessmentRate = 0.09;
    const loanTermMonths = 360;
    const r = assessmentRate / 12;

    let maxLoan = 0;
    let maxMonthlyRepayment = 0;

    if (monthlySurplus > 0) {
      maxMonthlyRepayment = Math.round(monthlySurplus * 0.95);
      maxLoan = maxMonthlyRepayment * ((1 - Math.pow(1 + r, -loanTermMonths)) / r);
      maxLoan = Math.floor(maxLoan / 5000) * 5000;
    }

    // 5. Reverse calculation: income needed for $735K target
    const targetLoan = 735000;
    const targetMonthlyRepayment = targetLoan / ((1 - Math.pow(1 + r, -loanTermMonths)) / r);
    const targetMonthlySurplus = targetMonthlyRepayment / 0.95;
    const incomeNeededMonthly = targetMonthlySurplus + declaredExpenses;
    const incomeNeededForTarget = Math.ceil(incomeNeededMonthly * 12 / 1000) * 1000;

    return new Response(JSON.stringify({
      success: true,
      data: {
        max_loan: maxLoan,
        monthly_income: monthlyIncome,
        income_source: incomeSource,
        lender_annual_income: lenderAnnualIncome,
        actual_monthly_expenses: actualMonthlyExpenses,
        hem_benchmark: hemBenchmark,
        declared_expenses: declaredExpenses,
        monthly_surplus: monthlySurplus,
        max_monthly_repayment: maxMonthlyRepayment,
        assessment_rate: assessmentRate,
        target_loan: targetLoan,
        target_achievable: maxLoan >= targetLoan,
        income_needed_for_target: incomeNeededForTarget,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compute borrowing capacity',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
