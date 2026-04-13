import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

interface FhgCriterion {
  id: string;
  label: string;
  detail: string | null;
  criterion_type: string;
  confirmed: number;
  confirmed_at: string | null;
}

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT id, label, detail, criterion_type, confirmed, confirmed_at
       FROM fhg_eligibility
       ORDER BY ROWID ASC`
    ).all();

    const criteria = result.results as FhgCriterion[];

    // Auto-compute income-cap criterion
    const incomeCap = criteria.find((c) => c.id === 'income-cap');
    if (incomeCap) {
      const incomeResult = await db.prepare(
        `SELECT personal_taxable_income FROM income_records
         WHERE personal_taxable_income > 0
         ORDER BY financial_year DESC LIMIT 1`
      ).all();

      if (incomeResult.results.length > 0) {
        const taxableIncome = (incomeResult.results[0] as { personal_taxable_income: number }).personal_taxable_income;
        (incomeCap as any).computed_value = taxableIncome;
        if (taxableIncome < 125000) {
          (incomeCap as any).confirmed = 1;
          (incomeCap as any).status = 'met';
        } else {
          (incomeCap as any).confirmed = 0;
          (incomeCap as any).status = 'failed';
        }
      } else {
        (incomeCap as any).computed_value = null;
        (incomeCap as any).confirmed = 0;
        (incomeCap as any).status = 'unknown';
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: criteria,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch FHG eligibility',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, confirmed } = body;

    if (!id || typeof confirmed !== 'boolean') {
      return new Response(JSON.stringify({ success: false, error: 'id and confirmed (boolean) are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB();

    // Check if this is a computed criterion
    const existing = await db.prepare(
      `SELECT criterion_type FROM fhg_eligibility WHERE id = ?`
    ).bind(id).all();

    if (existing.results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Criterion not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if ((existing.results[0] as { criterion_type: string }).criterion_type === 'computed') {
      return new Response(JSON.stringify({ success: false, error: 'Cannot manually update a computed criterion' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const confirmedInt = confirmed ? 1 : 0;
    const confirmedAt = confirmed ? new Date().toISOString() : null;

    await db.prepare(
      `UPDATE fhg_eligibility SET confirmed = ?, confirmed_at = ? WHERE id = ?`
    ).bind(confirmedInt, confirmedAt, id).run();

    return new Response(JSON.stringify({
      success: true,
      data: { id, confirmed: confirmedInt },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update criterion',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
