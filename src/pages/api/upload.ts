import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { parseCSV } from '../../lib/csv-parser';

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
    const transactions = parseCSV(content);

    if (transactions.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No valid transactions found in CSV' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDB();
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

    return new Response(JSON.stringify({
      success: true,
      data: {
        total: transactions.length,
        new_count: newCount,
        duplicate_count: duplicateCount,
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
