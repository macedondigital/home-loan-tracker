import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT id, label, detail, criterion_type, confirmed, confirmed_at
       FROM fhg_eligibility
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

    const existing = await db.prepare(
      `SELECT id FROM fhg_eligibility WHERE id = ?`
    ).bind(id).all();

    if (existing.results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Criterion not found' }), {
        status: 404,
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
