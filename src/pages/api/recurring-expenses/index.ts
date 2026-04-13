import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT id, name, amount, frequency, day_of_month, category, match_pattern, active
       FROM recurring_expenses
       ORDER BY amount DESC`
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
      error: error instanceof Error ? error.message : 'Failed to fetch recurring expenses',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, amount, frequency, day_of_month, category, match_pattern } = body;

    if (!name || !amount || !frequency || !category || !match_pattern) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB();
    const result = await db.prepare(
      `INSERT INTO recurring_expenses (name, amount, frequency, day_of_month, category, match_pattern)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(name, amount, frequency, day_of_month ?? null, category, match_pattern).run();

    return new Response(JSON.stringify({
      success: true,
      data: { id: result.meta.last_row_id, name, amount, frequency, day_of_month, category, match_pattern, active: 1 },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create recurring expense',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
