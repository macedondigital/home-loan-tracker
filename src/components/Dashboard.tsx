import { useState, useEffect, useCallback } from 'react';

interface BalanceData {
  bank_australia: number;
  nab_business: number;
  recorded_at: string;
}

interface ReadinessCriterion {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

interface ReadinessData {
  score: number;
  total: number;
  criteria: ReadinessCriterion[];
}

interface MilestoneData {
  id: string;
  label: string;
  completed: number;
}

interface MonthSummary {
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

interface UploadInfo {
  uploaded_at: string;
}

interface BalanceSnapshot {
  bank_australia: number;
  nab_business: number;
  recorded_at: string;
}

interface UploadRecord {
  id: number;
  filename: string;
  txn_count: number;
  new_count: number;
  duplicate_count: number;
  uploaded_at: string;
}

const BUFFER_TARGET = 62000;
const PROBLEM_CATEGORIES = ['uber-eats', 'amazon', 'eating-out'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Australia/Melbourne',
  });
}

function daysSince(dateStr: string): number {
  const now = new Date();
  const then = new Date(dateStr);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [bankAu, setBankAu] = useState('');
  const [nabBiz, setNabBiz] = useState('');
  const [saving, setSaving] = useState(false);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [lastUpload, setLastUpload] = useState<UploadInfo | null>(null);
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [trendData, setTrendData] = useState<Record<string, Record<string, number>>>({});
  const [recentSummary, setRecentSummary] = useState<CategorySummary[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceSnapshot[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, readyRes, mileRes, monthsRes, balHistRes, uploadsRes] = await Promise.all([
        fetch('/api/balances').then((r) => r.json()),
        fetch('/api/readiness').then((r) => r.json()),
        fetch('/api/milestones').then((r) => r.json()),
        fetch('/api/months').then((r) => r.json()),
        fetch('/api/balances/history').then((r) => r.json()),
        fetch('/api/uploads').then((r) => r.json()),
      ]);

      if (balRes.success && balRes.data) {
        setBalances(balRes.data);
        setBankAu(formatCurrency(balRes.data.bank_australia));
        setNabBiz(formatCurrency(balRes.data.nab_business));
      }

      if (readyRes.success) setReadiness(readyRes.data);
      if (mileRes.success) setMilestones(mileRes.data);
      if (monthsRes.success) setMonths(monthsRes.data);
      if (balHistRes.success) setBalanceHistory(balHistRes.data);
      if (uploadsRes.success) setUploadHistory(uploadsRes.data);

      // Fetch last upload info
      const lastUploadRes = await fetch('/api/uploads/latest').then((r) => r.json()).catch(() => ({ success: false }));
      if (lastUploadRes.success && lastUploadRes.data) setLastUpload(lastUploadRes.data);

      // Fetch trend data for problem categories across all months
      if (monthsRes.success && monthsRes.data.length > 0) {
        const summaries = await Promise.all(
          monthsRes.data.map((m: MonthSummary) =>
            fetch(`/api/summary?month=${m.month_key}`).then((r) => r.json())
          )
        );

        const trend: Record<string, Record<string, number>> = {};
        const latestSummary = summaries[0];

        for (const res of summaries) {
          if (!res.success) continue;
          const monthKey = res.data.month;
          trend[monthKey] = {};
          for (const cat of res.data.categories) {
            if (PROBLEM_CATEGORIES.includes(cat.id)) {
              trend[monthKey][cat.id] = cat.actual;
            }
          }
        }

        setTrendData(trend);

        if (latestSummary?.success) {
          setRecentSummary(
            latestSummary.data.categories.filter((c: CategorySummary) =>
              PROBLEM_CATEGORIES.includes(c.id)
            )
          );
        }
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatInput = (value: string): string => {
    const num = parseFloat(value.replace(/[$,\s]/g, ''));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const rawValue = (value: string): string => {
    return value.replace(/[$,\s]/g, '');
  };

  const saveBalances = async () => {
    const ba = parseFloat(rawValue(bankAu));
    const nab = parseFloat(rawValue(nabBiz));
    if (isNaN(ba) || isNaN(nab)) return;

    setSaving(true);
    try {
      const res = await fetch('/api/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_australia: ba, nab_business: nab }),
      });
      const data = await res.json();
      if (data.success) {
        setBalances({ bank_australia: ba, nab_business: nab, recorded_at: new Date().toISOString() });
      }
    } catch (e) {
      console.error('Failed to save balances:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading dashboard...</div>;
  }

  const combined = balances ? balances.bank_australia + balances.nab_business : 0;
  const buffer = combined - BUFFER_TARGET;
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const uploadDays = lastUpload ? daysSince(lastUpload.uploaded_at) : null;

  return (
    <div>
      {/* Balance Cards */}
      <div style={styles.cardGrid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Bank Australia</div>
          <div style={styles.cardValue}>{balances ? formatCurrency(balances.bank_australia) : 'Not set'}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>NAB Business</div>
          <div style={styles.cardValue}>{balances ? formatCurrency(balances.nab_business) : 'Not set'}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Combined Total</div>
          <div style={{ ...styles.cardValue, color: '#166534' }}>{balances ? formatCurrency(combined) : 'Not set'}</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Buffer (after $62k)</div>
          <div style={{ ...styles.cardValue, color: buffer >= 0 ? '#166534' : '#dc2626' }}>
            {balances ? formatCurrency(buffer) : 'Not set'}
          </div>
        </div>
      </div>

      {/* Balance Input */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Update Balances</h2>
        <div style={styles.balanceInputRow}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Bank Australia</label>
            <input
              type="text"
              inputMode="numeric"
              value={bankAu}
              onChange={(e) => setBankAu(e.target.value)}
              onFocus={(e) => { e.target.value = rawValue(bankAu); setBankAu(rawValue(bankAu)); }}
              onBlur={() => setBankAu(formatInput(bankAu))}
              style={styles.input}
              placeholder="$0"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>NAB Business</label>
            <input
              type="text"
              inputMode="numeric"
              value={nabBiz}
              onChange={(e) => setNabBiz(e.target.value)}
              onFocus={(e) => { e.target.value = rawValue(nabBiz); setNabBiz(rawValue(nabBiz)); }}
              onBlur={() => setNabBiz(formatInput(nabBiz))}
              style={styles.input}
              placeholder="$0"
            />
          </div>
          <button onClick={saveBalances} disabled={saving} style={styles.saveBtn}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {balances?.recorded_at && (
          <div style={styles.lastUpdated}>Last updated: {formatDate(balances.recorded_at)}</div>
        )}
      </div>

      {/* Weekly Check-in */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Weekly Check In</h2>
        <div style={styles.card}>
          {uploadDays !== null ? (
            <div>
              <div style={{
                ...styles.uploadStatus,
                color: uploadDays > 14 ? '#dc2626' : uploadDays > 7 ? '#d97706' : '#166534',
              }}>
                {uploadDays === 0 ? 'Statement uploaded today' :
                 uploadDays === 1 ? '1 day since last upload' :
                 `${uploadDays} days since last upload`}
              </div>
              {uploadDays > 14 && <div style={styles.uploadWarning}>Statement overdue. Upload this week's transactions.</div>}
              {uploadDays > 7 && uploadDays <= 14 && <div style={styles.uploadAmber}>Statement due. Upload when you can.</div>}
            </div>
          ) : (
            <div style={styles.uploadStatus}>No statements uploaded yet</div>
          )}
          {recentSummary.length > 0 && (
            <div style={styles.weeklySummary}>
              {recentSummary.map((cat) => (
                <div key={cat.id} style={styles.summaryItem}>
                  <span style={{ ...styles.categoryDot, background: cat.color }} />
                  <span>{cat.label}: </span>
                  <span style={{ fontWeight: 600, color: cat.over_target ? '#dc2626' : '#374151' }}>
                    {formatCurrency(cat.actual)}
                  </span>
                  {cat.target !== null && (
                    <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}> / {formatCurrency(cat.target)} target</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Broker Readiness Score */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Broker Readiness</h2>
        <div style={styles.card}>
          <div style={styles.readinessHeader}>
            <div style={styles.scoreRing}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke={readiness && readiness.score >= 7 ? '#166534' : readiness && readiness.score >= 4 ? '#d97706' : '#dc2626'}
                  strokeWidth="6"
                  strokeDasharray={`${(readiness?.score ?? 0) / 10 * 213.6} 213.6`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                />
                <text x="40" y="45" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1a1a1a">
                  {readiness?.score ?? 0}
                </text>
              </svg>
              <div style={styles.scoreLabel}>out of 10</div>
            </div>
          </div>
          <div style={styles.criteriaList}>
            {readiness?.criteria.map((c) => (
              <div key={c.id} style={styles.criterionRow}>
                <span style={{ ...styles.criterionIcon, color: c.pass ? '#166534' : '#dc2626' }}>
                  {c.pass ? '\u2713' : '\u2717'}
                </span>
                <div>
                  <div style={styles.criterionLabel}>{c.label}</div>
                  <div style={styles.criterionDetail}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Progress */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Timeline Progress</h2>
        <div style={styles.card}>
          <div style={styles.progressLabel}>{completedMilestones} of 9 milestones complete</div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${(completedMilestones / 9) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {Object.keys(trendData).length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Problem Categories Trend</h2>
          <div style={{ ...styles.card, overflowX: 'auto' as const }}>
            <TrendChart data={trendData} />
          </div>
        </div>
      )}

      {/* Balance History */}
      {balanceHistory.length > 1 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Balance History</h2>
          <div style={{ ...styles.card, overflowX: 'auto' as const }}>
            <BalanceHistoryChart data={balanceHistory} />
          </div>
        </div>
      )}

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Upload History</h2>
          <div style={styles.card}>
            {uploadHistory.map((u) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' }}>
                <div>
                  <span style={{ color: '#374151', fontWeight: 500 }}>{u.filename || 'CSV upload'}</span>
                  <span style={{ color: '#9ca3af', marginLeft: 8 }}>{formatDate(u.uploaded_at)}</span>
                </div>
                <div style={{ color: '#6b7280', whiteSpace: 'nowrap' as const }}>
                  {u.new_count} new, {u.duplicate_count} skipped
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BalanceHistoryChart({ data }: { data: BalanceSnapshot[] }) {
  if (data.length < 2) return null;

  const points = data.map((d) => ({
    combined: d.bank_australia + d.nab_business,
    date: d.recorded_at,
  }));

  const maxVal = Math.max(...points.map((p) => p.combined));
  const minVal = Math.min(...points.map((p) => p.combined));
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 140;
  const padX = 0;
  const padY = 10;

  const pathPoints = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (p.combined - minVal) / range) * (height - padY * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${pathPoints.join(' L ')}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.75rem', color: '#6b7280' }}>
        <span>{formatCurrency(maxVal)}</span>
        <span>{formatCurrency(minVal)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        <path d={pathD} fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const x = padX + (i / (points.length - 1)) * (width - padX * 2);
          const y = padY + (1 - (p.combined - minVal) / range) * (height - padY * 2);
          return <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="#166534" strokeWidth="2" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.625rem', color: '#9ca3af' }}>
        <span>{formatDate(points[0].date)}</span>
        <span>{formatDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: Record<string, Record<string, number>> }) {
  const months = Object.keys(data).sort();
  const catColors: Record<string, string> = {
    'uber-eats': '#dc2626',
    'amazon': '#ea580c',
    'eating-out': '#d97706',
  };
  const catLabels: Record<string, string> = {
    'uber-eats': 'Uber Eats',
    'amazon': 'Amazon',
    'eating-out': 'Eating out',
  };

  const maxTotal = Math.max(
    ...months.map((m) =>
      PROBLEM_CATEGORIES.reduce((sum, cat) => sum + (data[m]?.[cat] ?? 0), 0)
    ),
    1
  );

  const barWidth = Math.max(60, Math.min(100, 600 / months.length));

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' as const }}>
        {PROBLEM_CATEGORIES.map((cat) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: catColors[cat], display: 'inline-block' }} />
            {catLabels[cat]}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', minHeight: 160 }}>
        {months.map((month) => {
          const segments = PROBLEM_CATEGORIES.map((cat) => ({
            id: cat,
            value: data[month]?.[cat] ?? 0,
            color: catColors[cat],
          }));
          const total = segments.reduce((s, seg) => s + seg.value, 0);

          return (
            <div key={month} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', width: barWidth }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: '#374151' }}>
                {formatCurrency(total)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column-reverse' as const, width: '100%', height: 120 }}>
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
              <div style={{ fontSize: '0.6875rem', color: '#6b7280', marginTop: 4 }}>
                {new Date(Number(month.slice(0,4)), Number(month.slice(5))-1).toLocaleDateString('en-AU', { month: 'short' })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  card: {
    background: 'white',
    border: '1px solid #e8e6df',
    borderRadius: 12,
    padding: '1.25rem',
  },
  cardLabel: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    marginBottom: '0.375rem',
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: '#1a1a1a',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '1.125rem',
    color: '#1a1a1a',
    marginBottom: '0.75rem',
  },
  balanceInputRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap' as const,
  },
  inputGroup: {
    flex: 1,
    minWidth: 140,
  },
  inputLabel: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #e8e6df',
    borderRadius: 8,
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  saveBtn: {
    padding: '0.625rem 1.5rem',
    background: '#166534',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  lastUpdated: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '0.5rem',
  },
  uploadStatus: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  uploadWarning: {
    fontSize: '0.875rem',
    color: '#dc2626',
    marginTop: '0.375rem',
  },
  uploadAmber: {
    fontSize: '0.875rem',
    color: '#d97706',
    marginTop: '0.375rem',
  },
  weeklySummary: {
    marginTop: '1rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  readinessHeader: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  scoreRing: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  criteriaList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.625rem',
  },
  criterionRow: {
    display: 'flex',
    gap: '0.625rem',
    alignItems: 'flex-start',
  },
  criterionIcon: {
    fontSize: '1rem',
    fontWeight: 700,
    width: 20,
    flexShrink: 0,
  },
  criterionLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  criterionDetail: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  progressLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.5rem',
  },
  progressBar: {
    height: 8,
    background: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    background: '#166534',
    borderRadius: 4,
    transition: 'width 0.3s',
  },
};
