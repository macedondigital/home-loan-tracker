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
  notes: string | null;
}

function computeAssessable(r: IncomeRecord): number {
  return r.trust_distribution + r.add_back_depreciation + r.add_back_super + r.add_back_one_off + r.add_back_other;
}

function addBacksTotal(r: IncomeRecord): number {
  return r.add_back_depreciation + r.add_back_super + r.add_back_one_off + r.add_back_other;
}

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT financial_year, trust_distribution, personal_taxable_income,
              add_back_depreciation, add_back_super, add_back_one_off, add_back_other, notes
       FROM income_records
       ORDER BY financial_year ASC`
    ).all();

    const records = result.results as IncomeRecord[];
    const fy24 = records.find((r) => r.financial_year === 'FY24');
    const fy25 = records.find((r) => r.financial_year === 'FY25');
    const fy26 = records.find((r) => r.financial_year === 'FY26');

    const fy24Assessable = fy24 ? computeAssessable(fy24) : 0;
    const fy25Assessable = fy25 ? computeAssessable(fy25) : 0;
    const fy26Assessable = fy26 ? computeAssessable(fy26) : 0;
    const fy24HasData = fy24 ? fy24.trust_distribution > 0 : false;
    const fy25HasData = fy25 ? fy25.trust_distribution > 0 : false;
    const fy26HasData = fy26 ? fy26.trust_distribution > 0 : false;

    // Lender assessment: lower of two completed years (FY24/FY25 only)
    let data_completeness: 'full' | 'partial' | 'empty';
    let lender_annual_income: number;
    let constraining_year: string | null = null;

    if (fy24HasData && fy25HasData) {
      data_completeness = 'full';
      lender_annual_income = Math.min(fy24Assessable, fy25Assessable);
      constraining_year = fy24Assessable <= fy25Assessable ? 'FY24' : 'FY25';
    } else if (fy24HasData || fy25HasData) {
      data_completeness = 'partial';
      lender_annual_income = fy24HasData ? fy24Assessable : fy25Assessable;
      constraining_year = fy24HasData ? 'FY24' : 'FY25';
    } else {
      data_completeness = 'empty';
      lender_annual_income = 0;
    }

    const lender_monthly_income = Math.round(lender_annual_income / 12);

    // FY26 annualised (9.5 months of data)
    const current_year_annualised = fy26HasData ? Math.round(fy26Assessable * 12 / 9.5) : 0;

    // Basis mismatch detection
    const fy25Notes = (fy25?.notes || '').toLowerCase();
    const fy26Notes = (fy26?.notes || '').toLowerCase();
    const basis_mismatch = fy26Notes.includes('cash') && fy25Notes.includes('accrual');

    return new Response(JSON.stringify({
      success: true,
      data: {
        fy24: fy24 ? {
          trust_distribution: fy24.trust_distribution,
          add_backs_total: addBacksTotal(fy24),
          assessable: fy24Assessable,
        } : null,
        fy25: fy25 ? {
          trust_distribution: fy25.trust_distribution,
          add_backs_total: addBacksTotal(fy25),
          assessable: fy25Assessable,
        } : null,
        fy26: fy26 ? {
          trust_distribution: fy26.trust_distribution,
          add_backs_total: addBacksTotal(fy26),
          assessable: fy26Assessable,
          annualised: current_year_annualised,
        } : null,
        lender_annual_income,
        lender_monthly_income,
        constraining_year,
        current_year_annualised,
        data_completeness,
        basis_mismatch,
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
