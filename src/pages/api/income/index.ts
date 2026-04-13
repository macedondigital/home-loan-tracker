import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT id, financial_year, trust_distribution, personal_taxable_income,
              add_back_depreciation, add_back_super, add_back_one_off, add_back_other,
              notes, created_at, updated_at
       FROM income_records
       ORDER BY financial_year ASC`
    ).all();

    return new Response(JSON.stringify({
      success: true,
      data: result.results,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch income records',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { financial_year, trust_distribution, personal_taxable_income,
            add_back_depreciation, add_back_super, add_back_one_off, add_back_other, notes } = body;

    if (!financial_year) {
      return new Response(JSON.stringify({ success: false, error: 'financial_year is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB();
    await db.prepare(
      `INSERT INTO income_records (financial_year, trust_distribution, personal_taxable_income,
        add_back_depreciation, add_back_super, add_back_one_off, add_back_other, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(financial_year) DO UPDATE SET
        trust_distribution = COALESCE(excluded.trust_distribution, trust_distribution),
        personal_taxable_income = COALESCE(excluded.personal_taxable_income, personal_taxable_income),
        add_back_depreciation = COALESCE(excluded.add_back_depreciation, add_back_depreciation),
        add_back_super = COALESCE(excluded.add_back_super, add_back_super),
        add_back_one_off = COALESCE(excluded.add_back_one_off, add_back_one_off),
        add_back_other = COALESCE(excluded.add_back_other, add_back_other),
        notes = COALESCE(excluded.notes, notes),
        updated_at = datetime('now')`
    ).bind(
      financial_year,
      trust_distribution ?? 0,
      personal_taxable_income ?? 0,
      add_back_depreciation ?? 0,
      add_back_super ?? 0,
      add_back_one_off ?? 0,
      add_back_other ?? 0,
      notes ?? null,
    ).run();

    return new Response(JSON.stringify({
      success: true,
      data: { financial_year },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save income record',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
