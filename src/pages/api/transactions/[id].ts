import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import { ALL_CATEGORY_IDS } from '../../../lib/categories';

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;

  if (!id || isNaN(Number(id))) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid transaction ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const categoryOverride = body?.category_override;

    if (!categoryOverride || !ALL_CATEGORY_IDS.includes(categoryOverride)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid category' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB();
    const result = await db.prepare(
      `UPDATE transactions SET category_override = ? WHERE id = ?`
    ).bind(categoryOverride, Number(id)).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Transaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update transaction',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
