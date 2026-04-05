import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT id, label, detail, target_date, completed, completed_at
       FROM milestones
       ORDER BY ROWID ASC`
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
      error: error instanceof Error ? error.message : 'Failed to fetch milestones',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
