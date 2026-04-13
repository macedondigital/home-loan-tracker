import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

const VALID_STATUSES = ['not_started', 'in_progress', 'obtained'] as const;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Document ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDB();
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid status. Must be not_started, in_progress, or obtained.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const current = await db.prepare(
      `SELECT id FROM documents WHERE id = ?`
    ).bind(id).all();

    if (current.results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Document not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checked = status === 'obtained' ? 1 : 0;
    const checkedAt = status === 'obtained' ? new Date().toISOString() : null;

    await db.prepare(
      `UPDATE documents SET status = ?, checked = ?, checked_at = ? WHERE id = ?`
    ).bind(status, checked, checkedAt, id).run();

    return new Response(JSON.stringify({
      success: true,
      data: { id, status, checked },
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
