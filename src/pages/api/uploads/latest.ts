import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT filename, txn_count, new_count, duplicate_count, uploaded_at
       FROM uploads
       ORDER BY uploaded_at DESC
       LIMIT 1`
    ).all();

    return new Response(JSON.stringify({
      success: true,
      data: result.results[0] ?? null,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch upload info',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
