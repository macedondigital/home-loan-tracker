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

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const enriched = (result.results as any[]).map((m) => {
      const overdue = m.completed === 0 && m.target_date && m.target_date < currentMonth;
      let days_overdue = 0;
      if (overdue) {
        const [y, mo] = m.target_date.split('-');
        const targetStart = new Date(Number(y), Number(mo) - 1, 1);
        days_overdue = Math.floor((now.getTime() - targetStart.getTime()) / (1000 * 60 * 60 * 24));
      }
      return { ...m, overdue: !!overdue, days_overdue };
    });

    return new Response(JSON.stringify({
      success: true,
      data: enriched,
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
