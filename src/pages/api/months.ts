import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT month_key, COUNT(*) as count
       FROM transactions
       GROUP BY month_key
       ORDER BY month_key DESC`
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
      error: error instanceof Error ? error.message : 'Failed to fetch months',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
