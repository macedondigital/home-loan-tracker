import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

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
    const result = await db.prepare(
      `SELECT id, date, date_str, description, amount, balance, category, category_override, month_key, created_at
       FROM transactions
       WHERE month_key = ?
       ORDER BY date DESC, id DESC`
    ).bind(month).all();

    return new Response(JSON.stringify({
      success: true,
      data: result.results,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
