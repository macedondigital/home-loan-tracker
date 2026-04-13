import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

interface Lender {
  id: string;
  name: string;
  tier: string;
  is_participating_lender: number;
  assessment_method: string;
  accepts_one_year: number;
  accepts_trust_income: number;
  one_year_policy_note: string | null;
  trust_income_note: string | null;
  rate_premium_note: string | null;
  general_notes: string | null;
  sort_order: number;
}

interface IncomeRecord {
  financial_year: string;
  trust_distribution: number;
  add_back_depreciation: number;
  add_back_super: number;
  add_back_one_off: number;
  add_back_other: number;
}

function computeAssessable(r: IncomeRecord): number {
  return r.trust_distribution + r.add_back_depreciation + r.add_back_super + r.add_back_one_off + r.add_back_other;
}

function calcMaxLoan(annualIncome: number, declaredExpenses: number, isNonBank: boolean): number {
  const monthlyIncome = Math.round(annualIncome / 12);
  const monthlySurplus = monthlyIncome - declaredExpenses;
  if (monthlySurplus <= 0) return 0;

  const maxRepayment = Math.round(monthlySurplus * 0.95);
  const rate = isNonBank ? 0.08 / 12 : 0.09 / 12;
  const termMonths = 360;
  const maxLoan = maxRepayment * ((1 - Math.pow(1 + rate, -termMonths)) / rate);
  return Math.floor(maxLoan / 5000) * 5000;
}

export const GET: APIRoute = async () => {
  try {
    const db = getDB();

    const [lendersRes, incomeRes, expensesRes] = await Promise.all([
      db.prepare('SELECT * FROM lenders ORDER BY sort_order ASC').all(),
      db.prepare(
        `SELECT financial_year, trust_distribution, add_back_depreciation,
                add_back_super, add_back_one_off, add_back_other
         FROM income_records ORDER BY financial_year ASC`
      ).all(),
      db.prepare(
        `SELECT month_key FROM transactions GROUP BY month_key ORDER BY month_key DESC LIMIT 1`
      ).all(),
    ]);

    const lenders = lendersRes.results as Lender[];
    const incomeRecords = incomeRes.results as IncomeRecord[];

    const fy24 = incomeRecords.find((r) => r.financial_year === 'FY24');
    const fy25 = incomeRecords.find((r) => r.financial_year === 'FY25');

    const fy24Assessable = fy24 && fy24.trust_distribution > 0 ? computeAssessable(fy24) : 0;
    const fy25Assessable = fy25 && fy25.trust_distribution > 0 ? computeAssessable(fy25) : 0;
    const lowerOfTwo = fy24Assessable > 0 && fy25Assessable > 0 ? Math.min(fy24Assessable, fy25Assessable) : (fy24Assessable || fy25Assessable);
    const averageOfTwo = fy24Assessable > 0 && fy25Assessable > 0 ? Math.round((fy24Assessable + fy25Assessable) / 2) : lowerOfTwo;

    // Get actual monthly expenses
    let actualMonthlyExpenses = 0;
    if (expensesRes.results.length > 0) {
      const latestMonth = (expensesRes.results[0] as { month_key: string }).month_key;
      const expResult = await db.prepare(
        `SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE month_key = ? AND amount < 0`
      ).bind(latestMonth).all();
      if (expResult.results.length > 0) {
        actualMonthlyExpenses = Math.round((expResult.results[0] as { total: number }).total);
      }
    }
    const declaredExpenses = Math.max(actualMonthlyExpenses, 3100);
    const targetLoan = 735000;

    const results = lenders.map((lender) => {
      const isNonBank = lender.tier === 'non_bank';
      let bestCaseIncome = 0;
      let conservativeIncome = 0;

      switch (lender.assessment_method) {
        case 'one_year_or_lower_two': {
          if (lender.id === 'anz') {
            bestCaseIncome = Math.round(fy25Assessable * 0.8);
          } else {
            bestCaseIncome = fy25Assessable;
          }
          conservativeIncome = lowerOfTwo;
          break;
        }
        case 'manual_assessment': {
          bestCaseIncome = averageOfTwo;
          conservativeIncome = averageOfTwo;
          break;
        }
        case 'lower_two_or_average': {
          bestCaseIncome = averageOfTwo;
          conservativeIncome = lowerOfTwo;
          break;
        }
        case 'flexible_one_year':
        case 'flexible_alt_doc': {
          bestCaseIncome = fy25Assessable;
          conservativeIncome = fy25Assessable;
          break;
        }
      }

      const bestCaseMaxLoan = calcMaxLoan(bestCaseIncome, declaredExpenses, isNonBank);
      const conservativeMaxLoan = calcMaxLoan(conservativeIncome, declaredExpenses, isNonBank);
      const bestCaseAchievable = bestCaseMaxLoan >= targetLoan;
      const conservativeAchievable = conservativeMaxLoan >= targetLoan;

      let likelihood: 'high' | 'medium' | 'low' | 'not_applicable';
      if (!lender.is_participating_lender) {
        likelihood = 'not_applicable';
      } else if (bestCaseAchievable && lender.accepts_one_year) {
        likelihood = 'high';
      } else if (bestCaseAchievable || conservativeMaxLoan >= targetLoan * 0.85) {
        likelihood = 'medium';
      } else {
        likelihood = 'low';
      }

      return {
        id: lender.id,
        name: lender.name,
        tier: lender.tier,
        is_participating_lender: !!lender.is_participating_lender,
        assessment_method: lender.assessment_method,
        accepts_one_year: !!lender.accepts_one_year,
        best_case_income: bestCaseIncome,
        best_case_max_loan: bestCaseMaxLoan,
        best_case_achievable: bestCaseAchievable,
        conservative_income: conservativeIncome,
        conservative_max_loan: conservativeMaxLoan,
        conservative_achievable: conservativeAchievable,
        one_year_policy_note: lender.one_year_policy_note,
        trust_income_note: lender.trust_income_note,
        rate_premium_note: lender.rate_premium_note,
        general_notes: lender.general_notes,
        likelihood,
      };
    });

    const participatingAchievable = results.filter((l) => l.is_participating_lender && l.best_case_achievable).length;
    const participatingTotal = results.filter((l) => l.is_participating_lender).length;

    return new Response(JSON.stringify({
      success: true,
      data: {
        lenders: results,
        summary: {
          participating_achievable: participatingAchievable,
          participating_total: participatingTotal,
          target_loan: targetLoan,
        },
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compute lender comparison',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
