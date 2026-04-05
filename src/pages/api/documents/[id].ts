import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const PATCH: APIRoute = async ({ params }) => {
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Document ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDB();

    const current = await db.prepare(
      `SELECT checked FROM documents WHERE id = ?`
    ).bind(id).all();

    if (current.results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Document not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isChecked = (current.results[0] as Record<string, unknown>).checked as number;
    const newState = isChecked ? 0 : 1;
    const checkedAt = newState ? new Date().toISOString() : null;

    await db.prepare(
      `UPDATE documents SET checked = ?, checked_at = ? WHERE id = ?`
    ).bind(newState, checkedAt, id).run();

    return new Response(JSON.stringify({
      success: true,
      data: { id, checked: newState },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update document',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
