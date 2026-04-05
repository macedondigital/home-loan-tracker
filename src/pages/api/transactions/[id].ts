import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import { ALL_CATEGORY_IDS, extractMerchantPattern } from '../../../lib/categories';

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

    // Get the transaction description to create a merchant rule
    const txn = await db.prepare(
      `SELECT description FROM transactions WHERE id = ?`
    ).bind(Number(id)).all();

    if (txn.results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Transaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const description = (txn.results[0] as Record<string, unknown>).description as string;
    const merchantPattern = extractMerchantPattern(description);

    // Update the transaction
    await db.prepare(
      `UPDATE transactions SET category_override = ? WHERE id = ?`
    ).bind(categoryOverride, Number(id)).run();

    // Save merchant rule for future uploads (upsert)
    if (merchantPattern) {
      await db.prepare(
        `INSERT INTO merchant_rules (pattern, category, source_description)
         VALUES (?, ?, ?)
         ON CONFLICT(pattern) DO UPDATE SET category = excluded.category`
      ).bind(merchantPattern, categoryOverride, description).run();

      // Also apply to all other transactions with the same merchant in the current data
      await db.prepare(
        `UPDATE transactions
         SET category_override = ?
         WHERE LOWER(description) LIKE ? AND id != ? AND category_override IS NULL`
      ).bind(categoryOverride, `%${merchantPattern}%`, Number(id)).run();
    }

    return new Response(JSON.stringify({
      success: true,
      data: { merchant_pattern: merchantPattern },
    }), {
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
