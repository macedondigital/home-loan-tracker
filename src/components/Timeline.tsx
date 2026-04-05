import { useState, useEffect } from 'react';

interface Milestone {
  id: string;
  label: string;
  detail: string | null;
  target_date: string | null;
  completed: number;
  completed_at: string | null;
}

function formatTargetDate(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

export default function Timeline() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/milestones')
      .then((r) => r.json())
      .then((data) => { if (data.success) setMilestones(data.data); })
      .finally(() => setLoading(false));
  }, []);

  const toggleMilestone = async (id: string) => {
    const res = await fetch(`/api/milestones/${id}`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      setMilestones((prev) =>
        prev.map((m) => m.id === id ? { ...m, completed: data.data.completed } : m)
      );
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>;
  }

  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;

  return (
    <div>
      {/* Progress */}
      <div style={s.card}>
        <div style={s.progressLabel}>{completed} of {total} milestones complete</div>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${(completed / total) * 100}%` }} />
        </div>
      </div>

      {/* Milestone List */}
      <div style={{ ...s.card, marginTop: '1rem' }}>
        {milestones.map((m, i) => (
          <div
            key={m.id}
            onClick={() => toggleMilestone(m.id)}
            style={{
              ...s.milestoneRow,
              borderBottom: i < milestones.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{
              ...s.checkbox,
              background: m.completed ? '#166534' : 'white',
              borderColor: m.completed ? '#166534' : '#d1d5db',
            }}>
              {m.completed ? <span style={{ color: 'white', fontSize: '0.75rem' }}>{'\u2713'}</span> : null}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                ...s.milestoneLabel,
                textDecoration: m.completed ? 'line-through' : 'none',
                color: m.completed ? '#9ca3af' : '#374151',
              }}>
                {m.label}
              </div>
              {m.detail && (
                <div style={s.milestoneDetail}>{m.detail}</div>
              )}
            </div>
            {m.target_date && (
              <div style={s.targetDate}>{formatTargetDate(m.target_date)}</div>
            )}
          </div>
        ))}
      </div>

      {/* Key Numbers */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={s.sectionTitle}>Key Numbers</h2>
        <div style={s.card}>
          <table style={s.numbersTable}>
            <tbody>
              <NumberRow label="Property target" value="$750,000" />
              <NumberRow label="Loan via FHG (98%)" value="$735,000" />
              <NumberRow label="Deposit (2%)" value="$15,000" />
              <NumberRow label="Stamp duty" value="~$40,000" />
              <NumberRow label="Other costs" value="~$7,000" />
              <NumberRow label="Total cash needed" value="$62,000" bold />
              <NumberRow label="LMI cost" value="$0 (govt guaranteed)" />
              <NumberRow label="Est. monthly repayment (6.5%)" value="~$4,650" />
              <NumberRow label="Current rent (dead money)" value="$2,383/month" highlight />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NumberRow({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) {
  return (
    <tr>
      <td style={{ ...s.numLabel, fontWeight: bold ? 600 : 400 }}>{label}</td>
      <td style={{
        ...s.numValue,
        fontWeight: bold ? 700 : 600,
        color: highlight ? '#dc2626' : '#1a1a1a',
      }}>{value}</td>
    </tr>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: 'white', border: '1px solid #e8e6df', borderRadius: 12, padding: '1.25rem' },
  progressLabel: { fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' },
  progressBar: { height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#166534', borderRadius: 4, transition: 'width 0.3s' },
  milestoneRow: {
    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem 0',
    userSelect: 'none' as const,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, border: '2px solid #d1d5db',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1, transition: 'background 0.15s, border-color 0.15s',
  },
  milestoneLabel: { fontSize: '0.9375rem', fontWeight: 500, transition: 'color 0.15s' },
  milestoneDetail: { fontSize: '0.8125rem', color: '#9ca3af', marginTop: 2 },
  targetDate: {
    fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6',
    padding: '0.25rem 0.5rem', borderRadius: 4, whiteSpace: 'nowrap' as const, flexShrink: 0,
  },
  sectionTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.125rem',
    color: '#1a1a1a', marginBottom: '0.75rem',
  },
  numbersTable: { width: '100%', borderCollapse: 'collapse' as const },
  numLabel: { padding: '0.5rem 0', fontSize: '0.875rem', color: '#374151' },
  numValue: {
    padding: '0.5rem 0', fontSize: '0.875rem', textAlign: 'right' as const,
    fontWeight: 600, color: '#1a1a1a',
  },
};
