import { categorise } from './categories';

export interface ParsedTransaction {
  date: string;       // ISO format YYYY-MM-DD
  date_str: string;   // Original CSV date string
  description: string;
  amount: number;
  balance: number | null;
  category: string;
  month_key: string;  // YYYY-MM
}

/**
 * Parse a Bank Australia CSV file.
 * Format: Effective Date,Entered Date,Transaction Description,Amount,Balance
 * Amounts: prefixed with $, negatives have - before $ (e.g. -$45.00)
 * Some descriptions are wrapped in quotes.
 */
export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Detect and skip header row
  const firstLine = lines[0].toLowerCase();
  const startIndex = firstLine.includes('effective date') || firstLine.includes('transaction') ? 1 : 0;

  const transactions: ParsedTransaction[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;

    // Effective Date (field 0) may be empty; fall back to Entered Date (field 1)
    const dateStr = fields[0].trim() || fields[1].trim();
    const description = fields[2].trim().replace(/\\$/, ''); // Strip trailing backslash
    const amountStr = fields[3].trim();
    const balanceStr = fields.length > 4 ? fields[4].trim() : '';

    const date = parseDate(dateStr);
    if (!date) continue;

    const amount = parseAmount(amountStr);
    if (amount === null) continue;

    const balance = balanceStr ? parseAmount(balanceStr) : null;
    const month_key = date.slice(0, 7); // YYYY-MM
    const category = categorise(description, amount);

    transactions.push({
      date,
      date_str: dateStr,
      description,
      amount,
      balance,
      category,
      month_key,
    });
  }

  return transactions;
}

/**
 * Parse a CSV line handling quoted fields with commas inside.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

/**
 * Parse date from DD/MM/YYYY to YYYY-MM-DD.
 */
function parseDate(dateStr: string): string | null {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];

  return `${year}-${month}-${day}`;
}

/**
 * Parse amount string like "$45.00" or "-$1,200.50" to a number.
 */
function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
