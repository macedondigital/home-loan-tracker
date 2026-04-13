import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT id, label, checked, checked_at, status, required_for_preapproval
       FROM documents
       ORDER BY required_for_preapproval DESC, ROWID ASC`
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
      error: error instanceof Error ? error.message : 'Failed to fetch documents',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
