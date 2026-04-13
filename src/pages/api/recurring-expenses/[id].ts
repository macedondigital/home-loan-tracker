import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Expense ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDB();
    const body = await request.json();

    // Toggle active if no fields provided, otherwise update specified fields
    if (body.active !== undefined) {
      await db.prepare(
        `UPDATE recurring_expenses SET active = ? WHERE id = ?`
      ).bind(body.active ? 1 : 0, id).run();
    }

    if (body.amount !== undefined) {
      await db.prepare(
        `UPDATE recurring_expenses SET amount = ? WHERE id = ?`
      ).bind(body.amount, id).run();
    }

    if (body.name !== undefined) {
      await db.prepare(
        `UPDATE recurring_expenses SET name = ? WHERE id = ?`
      ).bind(body.name, id).run();
    }

    const updated = await db.prepare(
      `SELECT id, name, amount, frequency, day_of_month, category, match_pattern, active
       FROM recurring_expenses WHERE id = ?`
    ).bind(id).all();

    if (updated.results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Expense not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: updated.results[0],
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update recurring expense',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
