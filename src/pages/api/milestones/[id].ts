import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const PATCH: APIRoute = async ({ params }) => {
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Milestone ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDB();

    // Get current state
    const current = await db.prepare(
      `SELECT completed FROM milestones WHERE id = ?`
    ).bind(id).all();

    if (current.results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Milestone not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isCompleted = (current.results[0] as Record<string, unknown>).completed as number;
    const newState = isCompleted ? 0 : 1;
    const completedAt = newState ? new Date().toISOString() : null;

    await db.prepare(
      `UPDATE milestones SET completed = ?, completed_at = ? WHERE id = ?`
    ).bind(newState, completedAt, id).run();

    return new Response(JSON.stringify({
      success: true,
      data: { id, completed: newState },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update milestone',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
