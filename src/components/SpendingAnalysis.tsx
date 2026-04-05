import { useState, useEffect, useCallback, useRef } from 'react';
import { ALL_CATEGORY_IDS, CATEGORY_LABELS } from '../lib/categories';

interface MonthOption {
  month_key: string;
  count: number;
}

interface CategorySummary {
  id: string;
  label: string;
  color: string;
  actual: number;
  projected: number;
  target: number | null;
  count: number;
  over_target: boolean;
}

interface SummaryData {
  month: string;
  days_in_month: number;
  max_transaction_day: number;
  categories: CategorySummary[];
  income: { total: number; count: number };
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  category_override: string | null;
  month_key: string;
}

interface UploadResult {
  total: number;
  new_count: number;
  duplicate_count: number;
}

const PROBLEM_CATEGORIES = ['uber-eats', 'amazon', 'eating-out'];

function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

export default function SpendingAnalysis() {
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trendData, setTrendData] = useState<Record<string, Record<string, number>>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMonths = useCallback(async () => {
    const res = await fetch('/api/months').then((r) => r.json());
    if (res.success) {
      setMonths(res.data);
      if (res.data.length > 0 && !selectedMonth) {
        setSelectedMonth(res.data[0].month_key);
      }
    }
    setLoading(false);
  }, []);

  const fetchMonthData = useCallback(async (month: string) => {
    if (!month) return;
    const [sumRes, txnRes] = await Promise.all([
      fetch(`/api/summary?month=${month}`).then((r) => r.json()),
      fetch(`/api/transactions?month=${month}`).then((r) => r.json()),
    ]);
    if (sumRes.success) setSummary(sumRes.data);
    if (txnRes.success) setTransactions(txnRes.data);
  }, []);

  const fetchTrend = useCallback(async (monthList: MonthOption[]) => {
    if (monthList.length === 0) return;
    const summaries = await Promise.all(
      monthList.map((m) => fetch(`/api/summary?month=${m.month_key}`).then((r) => r.json()))
    );
    const trend: Record<string, Record<string, number>> = {};
    for (const res of summaries) {
      if (!res.success) continue;
      trend[res.data.month] = {};
      for (const cat of res.data.categories) {
        if (PROBLEM_CATEGORIES.includes(cat.id)) {
          trend[res.data.month][cat.id] = cat.actual;
        }
      }
    }
    setTrendData(trend);
  }, []);

  useEffect(() => { fetchMonths(); }, [fetchMonths]);
  useEffect(() => { if (selectedMonth) fetchMonthData(selectedMonth); }, [selectedMonth, fetchMonthData]);
  useEffect(() => { if (months.length > 0) fetchTrend(months); }, [months, fetchTrend]);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Only CSV files are accepted');
      return;
    }
    setUploading(true);
    setUploadResult(null);
    setUploadError('');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.success) {
        setUploadResult(data.data);
        // Refresh all data
        const monthsRes = await fetch('/api/months').then((r) => r.json());
        if (monthsRes.success) {
          setMonths(monthsRes.data);
          const newMonth = monthsRes.data[0]?.month_key;
          if (newMonth) {
            setSelectedMonth(newMonth);
            await fetchMonthData(newMonth);
          }
          await fetchTrend(monthsRes.data);
        }
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleCategoryChange = async (txnId: number, newCategory: string) => {
    const res = await fetch(`/api/transactions/${txnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_override: newCategory }),
    });
    const data = await res.json();
    if (data.success) {
      setTransactions((prev) =>
        prev.map((t) => t.id === txnId ? { ...t, category_override: newCategory } : t)
      );
      // Refresh summary to update category totals
      if (selectedMonth) {
        const sumRes = await fetch(`/api/summary?month=${selectedMonth}`).then((r) => r.json());
        if (sumRes.success) setSummary(sumRes.data);
      }
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>;
  }

  const totalSpent = summary?.categories.reduce((s, c) => s + c.actual, 0) ?? 0;
  const projectedTotal = summary?.categories.reduce((s, c) => s + c.projected, 0) ?? 0;
  const txnCount = transactions.length;

  return (
    <div>
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          ...s.uploadZone,
          borderColor: dragOver ? '#166534' : '#d1d5db',
          background: dragOver ? '#f0fdf4' : 'white',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
        />
        <div style={s.uploadText}>
          {uploading ? 'Uploading...' : 'Drop a Bank Australia CSV here or click to select'}
        </div>
      </div>
      {uploadResult && (
        <div style={s.uploadSuccess}>
          {uploadResult.new_count} new transactions imported, {uploadResult.duplicate_count} duplicates skipped
        </div>
      )}
      {uploadError && <div style={s.uploadErrorMsg}>{uploadError}</div>}

      {/* Month Selector */}
      {months.length > 0 && (
        <div style={s.monthRow}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={s.monthSelect}
          >
            {months.map((m) => (
              <option key={m.month_key} value={m.month_key}>
                {formatMonthLabel(m.month_key)} ({m.count} transactions)
              </option>
            ))}
          </select>
        </div>
      )}

      {summary && (
        <>
          {/* Summary Metrics */}
          <div style={s.metricsRow}>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Total Spent</div>
              <div style={s.metricValue}>{formatCurrency(totalSpent)}</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Projected Month Total</div>
              <div style={s.metricValue}>{formatCurrency(projectedTotal)}</div>
            </div>
            <div style={s.metricCard}>
              <div style={s.metricLabel}>Transactions</div>
              <div style={s.metricValue}>{txnCount}</div>
            </div>
            {summary.income.total > 0 && (
              <div style={s.metricCard}>
                <div style={s.metricLabel}>Income</div>
                <div style={{ ...s.metricValue, color: '#166534' }}>{formatCurrency(summary.income.total)}</div>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Category Breakdown</h2>
            <div style={s.card}>
              {summary.categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  transactions={transactions.filter((t) => (t.category_override || t.category) === cat.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Trend Chart */}
      {Object.keys(trendData).length > 0 && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Problem Categories Trend</h2>
          <div style={{ ...s.card, overflowX: 'auto' }}>
            <TrendChart data={trendData} />
          </div>
        </div>
      )}

      {/* Transaction List */}
      {transactions.length > 0 && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Transactions</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Date</th>
                  <th style={{ ...s.th, minWidth: 200 }}>Description</th>
                  <th style={s.th}>Category</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const effectiveCat = txn.category_override || txn.category;
                  const isIncome = txn.amount > 0;
                  return (
                    <tr key={txn.id} style={{ background: isIncome ? '#f0fdf4' : undefined }}>
                      <td style={s.td}>{new Date(txn.date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' })}</td>
                      <td style={{ ...s.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {txn.description}
                      </td>
                      <td style={s.td}>
                        <select
                          value={effectiveCat}
                          onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                          style={s.catSelect}
                        >
                          {ALL_CATEGORY_IDS.map((catId) => (
                            <option key={catId} value={catId}>{CATEGORY_LABELS[catId] ?? catId}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 600, color: isIncome ? '#166534' : '#1a1a1a' }}>
                        {formatCurrency(Math.abs(txn.amount), 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {months.length === 0 && !uploading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Upload a Bank Australia CSV to get started
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category, transactions }: { category: CategorySummary; transactions: Transaction[] }) {
  const [expanded, setExpanded] = useState(false);
  const maxVal = Math.max(category.actual, category.target ?? 0, category.projected);
  const barMax = maxVal > 0 ? maxVal * 1.2 : 100;
  const actualPct = (category.actual / barMax) * 100;
  const targetPct = category.target !== null ? (category.target / barMax) * 100 : null;

  return (
    <div style={s.catRow}>
      <div
        style={{ ...s.catHeader, cursor: 'pointer', userSelect: 'none' as const }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...s.dot, background: category.color }} />
          <span style={s.catName}>{category.label}</span>
          <span style={s.catCount}>({category.count})</span>
          <span style={{ fontSize: '0.6875rem', color: '#9ca3af', marginLeft: 2 }}>{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
        <div style={s.catAmounts}>
          <span style={{ fontWeight: 600, color: category.over_target ? '#dc2626' : '#1a1a1a' }}>
            {formatCurrency(category.actual)}
          </span>
          {category.target !== null && (
            <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}> / {formatCurrency(category.target)}</span>
          )}
        </div>
      </div>
      <div style={s.barTrack}>
        <div style={{
          ...s.barFill,
          width: `${Math.min(actualPct, 100)}%`,
          background: category.over_target ? '#dc2626' : category.color,
        }} />
        {targetPct !== null && (
          <div style={{ ...s.targetLine, left: `${Math.min(targetPct, 100)}%` }} />
        )}
      </div>
      {category.projected !== category.actual && (
        <div style={s.projectedLabel}>Projected: {formatCurrency(category.projected)}</div>
      )}
      {expanded && transactions.length > 0 && (
        <div style={{ marginTop: 8, paddingLeft: 16 }}>
          {transactions.map((txn) => (
            <div key={txn.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.375rem 0', borderBottom: '1px solid #f9fafb', fontSize: '0.8125rem',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                <span style={{ color: '#9ca3af', flexShrink: 0, fontSize: '0.75rem' }}>
                  {new Date(txn.date).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit' })}
                </span>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {txn.description}
                </span>
              </div>
              <span style={{ fontWeight: 500, color: '#1a1a1a', flexShrink: 0, marginLeft: 8 }}>
                {formatCurrency(Math.abs(txn.amount), 2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendChart({ data }: { data: Record<string, Record<string, number>> }) {
  const sortedMonths = Object.keys(data).sort();
  const catColors: Record<string, string> = { 'uber-eats': '#dc2626', 'amazon': '#ea580c', 'eating-out': '#d97706' };
  const catLabels: Record<string, string> = { 'uber-eats': 'Uber Eats', 'amazon': 'Amazon', 'eating-out': 'Eating out' };

  const maxTotal = Math.max(
    ...sortedMonths.map((m) => PROBLEM_CATEGORIES.reduce((sum, cat) => sum + (data[m]?.[cat] ?? 0), 0)),
    1
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {PROBLEM_CATEGORIES.map((cat) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: catColors[cat], display: 'inline-block' }} />
            {catLabels[cat]}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minHeight: 160 }}>
        {sortedMonths.map((month) => {
          const segments = PROBLEM_CATEGORIES.map((cat) => ({
            id: cat, value: data[month]?.[cat] ?? 0, color: catColors[cat],
          }));
          const total = segments.reduce((sum, seg) => sum + seg.value, 0);
          const barW = Math.max(50, Math.min(80, 500 / sortedMonths.length));

          return (
            <div key={month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: barW }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>
                {formatCurrency(total)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column-reverse', width: '100%', height: 120 }}>
                {segments.map((seg) => (
                  <div
                    key={seg.id}
                    style={{
                      width: '100%',
                      height: `${(seg.value / maxTotal) * 100}%`,
                      background: seg.color,
                      borderRadius: seg.id === 'eating-out' ? '4px 4px 0 0' : 0,
                    }}
                    title={`${catLabels[seg.id]}: ${formatCurrency(seg.value)}`}
                  />
                ))}
              </div>
              <div style={{ fontSize: '0.625rem', color: '#6b7280', marginTop: 4 }}>
                {new Date(Number(month.slice(0,4)), Number(month.slice(5))-1).toLocaleDateString('en-AU', { month: 'short' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  uploadZone: {
    border: '2px dashed #d1d5db',
    borderRadius: 12,
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    marginBottom: '0.75rem',
    transition: 'border-color 0.15s, background 0.15s',
  },
  uploadText: { fontSize: '0.875rem', color: '#6b7280' },
  uploadSuccess: {
    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
    padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem',
  },
  uploadErrorMsg: {
    background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
    padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem',
  },
  monthRow: { marginBottom: '1rem' },
  monthSelect: {
    padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e8e6df',
    fontSize: '0.9375rem', background: 'white', width: '100%', maxWidth: 360,
  },
  metricsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '0.75rem', marginBottom: '1.5rem',
  },
  metricCard: {
    background: 'white', border: '1px solid #e8e6df', borderRadius: 12, padding: '1rem',
  },
  metricLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 },
  metricValue: { fontSize: '1.375rem', fontWeight: 700, color: '#1a1a1a' },
  section: { marginBottom: '1.5rem' },
  sectionTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.125rem',
    color: '#1a1a1a', marginBottom: '0.75rem',
  },
  card: { background: 'white', border: '1px solid #e8e6df', borderRadius: 12, padding: '1rem' },
  catRow: { padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' },
  catHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  catName: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  catCount: { fontSize: '0.75rem', color: '#9ca3af' },
  catAmounts: { fontSize: '0.875rem', textAlign: 'right' as const },
  barTrack: {
    height: 6, background: '#f3f4f6', borderRadius: 3, position: 'relative' as const, overflow: 'visible' as const,
  },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.3s' },
  targetLine: {
    position: 'absolute' as const, top: -2, width: 2, height: 10, background: '#1a1a1a', borderRadius: 1,
  },
  projectedLabel: { fontSize: '0.6875rem', color: '#9ca3af', marginTop: 4 },
  table: {
    width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem',
    background: 'white', border: '1px solid #e8e6df', borderRadius: 12,
  },
  th: {
    textAlign: 'left' as const, padding: '0.625rem 0.75rem', borderBottom: '1px solid #e8e6df',
    fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const,
    letterSpacing: '0.025em',
  },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' as const },
  catSelect: {
    padding: '0.25rem 0.375rem', borderRadius: 4, border: '1px solid #e8e6df',
    fontSize: '0.75rem', background: 'white', cursor: 'pointer',
  },
};
