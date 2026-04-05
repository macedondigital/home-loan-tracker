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
  detail: string | null;
  target_date: string | null;
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

const BUFFER_TARGET = 62000;
const SETTLEMENT_DATE = new Date('2026-10-01');
const PROBLEM_CATEGORIES = ['uber-eats', 'amazon', 'eating-out', 'retail'];

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

function daysUntilSettlement(): number {
  const now = new Date();
  return Math.max(0, Math.ceil((SETTLEMENT_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

interface NextMove {
  title: string;
  description: string;
  priority: 'urgent' | 'important' | 'normal' | 'info';
}

function buildNextMoves(
  uploadDays: number | null,
  milestones: MilestoneData[],
  readiness: ReadinessData | null,
  problemSpending: CategorySummary[],
): NextMove[] {
  const moves: NextMove[] = [];

  // Statement overdue
  if (uploadDays === null) {
    moves.push({ title: 'Upload your first bank statement', description: 'You need 3+ months of clean data for the broker.', priority: 'urgent' });
  } else if (uploadDays > 7) {
    moves.push({ title: 'Upload your bank statement', description: `${uploadDays} days since last upload. Keep the data flowing weekly.`, priority: 'urgent' });
  }

  // Problem spending
  for (const cat of problemSpending) {
    if (cat.target !== null && cat.over_target) {
      if (cat.id === 'uber-eats') {
        moves.push({ title: 'Stop Uber Eats', description: `${formatCurrency(cat.actual)} this month. Target is $0. This is a red flag for brokers.`, priority: 'urgent' });
      } else {
        moves.push({ title: `Cut ${cat.label} spending`, description: `${formatCurrency(cat.actual)} this month (target ${formatCurrency(cat.target)}). Projected: ${formatCurrency(cat.projected)}.`, priority: 'important' });
      }
    }
  }

  // Upcoming milestones
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (const m of milestones) {
    if (!m.completed && m.target_date && m.target_date <= currentMonth) {
      moves.push({ title: m.label, description: m.detail || 'Due this month.', priority: 'important' });
    }
  }

  // Future milestones (next month)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  for (const m of milestones) {
    if (!m.completed && m.target_date === nextMonthKey) {
      moves.push({ title: m.label, description: m.detail || 'Coming up next month.', priority: 'normal' });
    }
  }

  // Spending that's on track but worth watching
  for (const cat of problemSpending) {
    if (cat.target !== null && !cat.over_target && cat.actual > 0) {
      moves.push({ title: `Watch ${cat.label} spending`, description: `${formatCurrency(cat.actual)} of ${formatCurrency(cat.target)} target used.`, priority: 'info' });
    }
  }

  return moves.slice(0, 6);
}

export default function Dashboard() {
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [bankAu, setBankAu] = useState('');
  const [nabBiz, setNabBiz] = useState('');
  const [saving, setSaving] = useState(false);
  const [showBalanceInput, setShowBalanceInput] = useState(false);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [lastUpload, setLastUpload] = useState<UploadInfo | null>(null);
  const [problemSpending, setProblemSpending] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [balRes, readyRes, mileRes, monthsRes] = await Promise.all([
        fetch('/api/balances').then((r) => r.json()),
        fetch('/api/readiness').then((r) => r.json()),
        fetch('/api/milestones').then((r) => r.json()),
        fetch('/api/months').then((r) => r.json()),
      ]);

      if (balRes.success && balRes.data) {
        setBalances(balRes.data);
        setBankAu(formatCurrency(balRes.data.bank_australia));
        setNabBiz(formatCurrency(balRes.data.nab_business));
      }

      if (readyRes.success) setReadiness(readyRes.data);
      if (mileRes.success) setMilestones(mileRes.data);

      const lastUploadRes = await fetch('/api/uploads/latest').then((r) => r.json()).catch(() => ({ success: false }));
      if (lastUploadRes.success && lastUploadRes.data) setLastUpload(lastUploadRes.data);

      // Get spending for most recent month
      if (monthsRes.success && monthsRes.data.length > 0) {
        const latestMonth = (monthsRes.data as MonthSummary[])[0].month_key;
        const sumRes = await fetch(`/api/summary?month=${latestMonth}`).then((r) => r.json());
        if (sumRes.success) {
          setProblemSpending(
            sumRes.data.categories.filter((c: CategorySummary) => PROBLEM_CATEGORIES.includes(c.id))
          );
        }
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatInput = (value: string): string => {
    const num = parseFloat(value.replace(/[$,\s]/g, ''));
    if (isNaN(num)) return value;
    return formatCurrency(num);
  };

  const rawValue = (value: string): string => value.replace(/[$,\s]/g, '');

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
        setShowBalanceInput(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>;
  }

  const combined = balances ? balances.bank_australia + balances.nab_business : 0;
  const buffer = combined - BUFFER_TARGET;
  const completedMilestones = milestones.filter((m) => m.completed).length;
  const uploadDays = lastUpload ? daysSince(lastUpload.uploaded_at) : null;
  const daysLeft = daysUntilSettlement();
  const nextMoves = buildNextMoves(uploadDays, milestones, readiness, problemSpending);

  const priorityColors = {
    urgent: { bg: '#fef2f2', border: '#fecaca', num: '#dc2626' },
    important: { bg: '#fffbeb', border: '#fde68a', num: '#d97706' },
    normal: { bg: '#f0fdf4', border: '#bbf7d0', num: '#166534' },
    info: { bg: '#f8fafc', border: '#e2e8f0', num: '#6b7280' },
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: '0.25rem' }}>
        <h1 style={s.greeting}>{daysLeft} days to go.</h1>
        <p style={s.subtext}>Here's what needs your attention right now.</p>
      </div>

      {/* Next Moves */}
      {nextMoves.length > 0 && (
        <div style={s.card}>
          <h2 style={s.sectionTitle}>Your next moves</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {nextMoves.map((move, i) => {
              const colors = priorityColors[move.priority];
              return (
                <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: colors.num, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1a1a1a' }}>{move.title}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: 2 }}>{move.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Strip */}
      <div style={s.statsGrid}>
        <div style={s.statBlock} onClick={() => setShowBalanceInput(!showBalanceInput)}>
          <div>
            <div style={s.statLabel}>Combined balance</div>
            <div style={{ ...s.statValue, color: '#166534' }}>{balances ? formatCurrency(combined) : 'Not set'}</div>
          </div>
          <div style={s.miniRing}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none"
                stroke={readiness && readiness.score >= 7 ? '#166534' : readiness && readiness.score >= 4 ? '#d97706' : '#dc2626'}
                strokeWidth="4"
                strokeDasharray={`${((readiness?.score ?? 0) / 10) * 125.7} 125.7`}
                strokeLinecap="round"
                transform="rotate(-90 24 24)" />
              <text x="24" y="28" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1a1a">{readiness?.score ?? 0}</text>
            </svg>
            <span style={s.miniRingLabel}>Readiness</span>
          </div>
        </div>
        <div style={s.statBlock}>
          <div>
            <div style={s.statLabel}>Surplus above purchase costs</div>
            <div style={{ ...s.statValue, color: buffer >= 0 ? '#166534' : '#dc2626' }}>{balances ? formatCurrency(buffer) : 'Not set'}</div>
          </div>
          <div style={s.miniRing}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none" stroke="#166534" strokeWidth="4"
                strokeDasharray={`${(completedMilestones / 9) * 125.7} 125.7`}
                strokeLinecap="round"
                transform="rotate(-90 24 24)" />
              <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a1a">{completedMilestones}/9</text>
            </svg>
            <span style={s.miniRingLabel}>Milestones</span>
          </div>
        </div>
      </div>

      {/* Balance Input (toggle) */}
      {showBalanceInput && (
        <div style={{ ...s.card, marginBottom: '1rem' }}>
          <h2 style={s.sectionTitle}>Update balances</h2>
          <div style={s.balanceRow}>
            <div style={s.inputGroup}>
              <label style={s.inputLabel}>Bank Australia</label>
              <input type="text" inputMode="numeric" value={bankAu}
                onChange={(e) => setBankAu(e.target.value)}
                onFocus={() => setBankAu(rawValue(bankAu))}
                onBlur={() => setBankAu(formatInput(bankAu))}
                style={s.input} placeholder="$0" />
            </div>
            <div style={s.inputGroup}>
              <label style={s.inputLabel}>NAB Business</label>
              <input type="text" inputMode="numeric" value={nabBiz}
                onChange={(e) => setNabBiz(e.target.value)}
                onFocus={() => setNabBiz(rawValue(nabBiz))}
                onBlur={() => setNabBiz(formatInput(nabBiz))}
                style={s.input} placeholder="$0" />
            </div>
            <button onClick={saveBalances} disabled={saving} style={s.saveBtn}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {balances?.recorded_at && (
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>Last updated: {formatDate(balances.recorded_at)}</div>
          )}
        </div>
      )}

      {/* Problem Categories */}
      {problemSpending.length > 0 && (
        <div style={s.card}>
          <h2 style={s.sectionTitle}>Problem categories this month</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {problemSpending.map((cat) => {
              const over = cat.target !== null && cat.over_target;
              return (
                <span key={cat.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem', borderRadius: 100,
                  fontSize: '0.8125rem', fontWeight: 500,
                  background: over ? '#fef2f2' : '#f0fdf4',
                  color: over ? '#dc2626' : '#166534',
                }}>
                  {cat.label}: {formatCurrency(cat.actual)}
                  {cat.target !== null && <span style={{ opacity: 0.7 }}>(target {formatCurrency(cat.target)})</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  greeting: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '1.5rem',
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },
  subtext: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  card: {
    background: 'white',
    border: '1px solid #e8e6df',
    borderRadius: 12,
    padding: '1.25rem',
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '1.125rem',
    color: '#1a1a1a',
    marginBottom: '0.75rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  statBlock: {
    background: 'white',
    border: '1px solid #e8e6df',
    borderRadius: 12,
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  statLabel: { fontSize: '0.75rem', color: '#6b7280' },
  statValue: { fontSize: '1.5rem', fontWeight: 700, marginTop: 2 },
  miniRing: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  miniRingLabel: { fontSize: '0.6875rem', color: '#6b7280', marginTop: '0.25rem' },
  balanceRow: { display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' as const },
  inputGroup: { flex: 1, minWidth: 140 },
  inputLabel: { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' },
  input: { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e8e6df', borderRadius: 8, fontSize: '1rem', outline: 'none', boxSizing: 'border-box' as const },
  saveBtn: { padding: '0.625rem 1.5rem', background: '#166534', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const },
};
