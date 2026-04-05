import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const db = getDB();
    const result = await db.prepare(
      `SELECT bank_australia, nab_business, recorded_at
       FROM bank_balances
       ORDER BY recorded_at DESC
       LIMIT 1`
    ).all();

    const row = result.results[0] as Record<string, unknown> | undefined;

    return new Response(JSON.stringify({
      success: true,
      data: row ? {
        bank_australia: row.bank_australia as number,
        nab_business: row.nab_business as number,
        recorded_at: row.recorded_at as string,
      } : null,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch balances',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const bankAustralia = Number(body?.bank_australia);
    const nabBusiness = Number(body?.nab_business);

    if (isNaN(bankAustralia) || isNaN(nabBusiness)) {
      return new Response(JSON.stringify({ success: false, error: 'Both balances are required as numbers' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB();
    await db.prepare(
      `INSERT INTO bank_balances (bank_australia, nab_business) VALUES (?, ?)`
    ).bind(bankAustralia, nabBusiness).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save balances',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
