import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { parseCSV } from '../../lib/csv-parser';
import type { MerchantRule } from '../../lib/categories';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ success: false, error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return new Response(JSON.stringify({ success: false, error: 'Only CSV files are accepted' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = await file.text();

    // Fetch merchant rules before parsing
    const db = getDB();
    const rulesResult = await db.prepare(
      `SELECT pattern, category FROM merchant_rules`
    ).all();
    const merchantRules = rulesResult.results as MerchantRule[];

    const transactions = parseCSV(content, merchantRules);

    if (transactions.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No valid transactions found in CSV' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    let newCount = 0;
    let duplicateCount = 0;

    // Use INSERT OR IGNORE for deduplication via UNIQUE constraint
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO transactions (date, date_str, description, amount, balance, category, month_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    // Batch in groups for performance
    const batchSize = 50;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const stmts = batch.map((txn) =>
        stmt.bind(txn.date, txn.date_str, txn.description, txn.amount, txn.balance, txn.category, txn.month_key)
      );
      const results = await db.batch(stmts);

      for (const result of results) {
        if (result.meta.changes > 0) {
          newCount++;
        } else {
          duplicateCount++;
        }
      }
    }

    // Log the upload
    await db.prepare(
      `INSERT INTO uploads (filename, txn_count, new_count, duplicate_count) VALUES (?, ?, ?, ?)`
    ).bind(file.name, transactions.length, newCount, duplicateCount).run();

    // Auto-update Bank Australia balance from latest transaction in this batch
    let balance_updated = false;
    let new_bank_australia: number | null = null;

    const txnsWithBalance = transactions.filter((t) => t.balance !== null);
    if (txnsWithBalance.length > 0) {
      // Find the transaction with the latest date
      const latest = txnsWithBalance.reduce((a, b) => a.date > b.date ? a : b);

      if (latest.balance !== null) {
        // Check if this is more recent than the current latest balance
        const latestBalance = await db.prepare(
          `SELECT recorded_at FROM bank_balances ORDER BY recorded_at DESC LIMIT 1`
        ).all();

        const latestRecordedAt = latestBalance.results.length > 0
          ? (latestBalance.results[0] as Record<string, unknown>).recorded_at as string
          : null;

        // Only update if CSV data is newer or no balance exists yet
        if (!latestRecordedAt || latest.date >= latestRecordedAt.slice(0, 10)) {
          // Get current NAB Business balance to preserve it
          let nabBusiness = 0;
          if (latestBalance.results.length > 0) {
            const prev = await db.prepare(
              `SELECT nab_business FROM bank_balances ORDER BY recorded_at DESC LIMIT 1`
            ).all();
            if (prev.results.length > 0) {
              nabBusiness = (prev.results[0] as Record<string, unknown>).nab_business as number;
            }
          }

          await db.prepare(
            `INSERT INTO bank_balances (bank_australia, nab_business, recorded_at) VALUES (?, ?, ?)`
          ).bind(latest.balance, nabBusiness, new Date().toISOString()).run();

          balance_updated = true;
          new_bank_australia = latest.balance;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        total: transactions.length,
        new_count: newCount,
        duplicate_count: duplicateCount,
        balance_updated,
        new_bank_australia,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
