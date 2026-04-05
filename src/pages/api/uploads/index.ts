import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT id, filename, txn_count, new_count, duplicate_count, uploaded_at
       FROM uploads
       ORDER BY uploaded_at DESC`
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
      error: error instanceof Error ? error.message : 'Failed to fetch uploads',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
