import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

interface IncomeRecord {
  financial_year: string;
  trust_distribution: number;
  personal_taxable_income: number;
  add_back_depreciation: number;
  add_back_super: number;
  add_back_one_off: number;
  add_back_other: number;
}

function computeAssessable(r: IncomeRecord): number {
  return r.trust_distribution + r.add_back_depreciation + r.add_back_super + r.add_back_one_off + r.add_back_other;
}

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT financial_year, trust_distribution, personal_taxable_income,
              add_back_depreciation, add_back_super, add_back_one_off, add_back_other
       FROM income_records
       ORDER BY financial_year ASC`
    ).all();

    const records = result.results as IncomeRecord[];
    const fy24 = records.find((r) => r.financial_year === 'FY24');
    const fy25 = records.find((r) => r.financial_year === 'FY25');

    const fy24Assessable = fy24 ? computeAssessable(fy24) : 0;
    const fy25Assessable = fy25 ? computeAssessable(fy25) : 0;
    const fy24HasData = fy24 ? fy24.trust_distribution > 0 : false;
    const fy25HasData = fy25 ? fy25.trust_distribution > 0 : false;

    let data_completeness: 'full' | 'partial' | 'empty';
    let lender_annual_income: number;

    if (fy24HasData && fy25HasData) {
      data_completeness = 'full';
      lender_annual_income = Math.min(fy24Assessable, fy25Assessable);
    } else if (fy24HasData || fy25HasData) {
      data_completeness = 'partial';
      lender_annual_income = fy24HasData ? fy24Assessable : fy25Assessable;
    } else {
      data_completeness = 'empty';
      lender_annual_income = 0;
    }

    const lender_monthly_income = Math.round(lender_annual_income / 12);

    return new Response(JSON.stringify({
      success: true,
      data: {
        fy24: fy24 ? {
          trust_distribution: fy24.trust_distribution,
          add_backs_total: fy24.add_back_depreciation + fy24.add_back_super + fy24.add_back_one_off + fy24.add_back_other,
          assessable: fy24Assessable,
        } : null,
        fy25: fy25 ? {
          trust_distribution: fy25.trust_distribution,
          add_backs_total: fy25.add_back_depreciation + fy25.add_back_super + fy25.add_back_one_off + fy25.add_back_other,
          assessable: fy25Assessable,
        } : null,
        lender_annual_income,
        lender_monthly_income,
        data_completeness,
        income_sufficient_for_target: lender_annual_income >= 150000,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compute income assessment',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
