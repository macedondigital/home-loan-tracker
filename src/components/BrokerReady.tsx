import { useState, useEffect } from 'react';

interface Criterion {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

interface ReadinessData {
  score: number;
  total: number;
  criteria: Criterion[];
}

interface Document {
  id: string;
  label: string;
  checked: number;
  status: 'not_started' | 'in_progress' | 'obtained';
  required_for_preapproval: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

export default function BrokerReady() {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/readiness').then((r) => r.json()),
      fetch('/api/documents').then((r) => r.json()),
    ]).then(([readyRes, docsRes]) => {
      if (readyRes.success) setReadiness(readyRes.data);
      if (docsRes.success) setDocuments(docsRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const cycleStatus = async (doc: Document) => {
    const cycle: Record<string, 'not_started' | 'in_progress' | 'obtained'> = {
      not_started: 'in_progress',
      in_progress: 'obtained',
      obtained: 'not_started',
    };
    const newStatus = cycle[doc.status] || 'in_progress';
    setDocuments((prev) =>
      prev.map((d) => d.id === doc.id ? { ...d, status: newStatus, checked: newStatus === 'obtained' ? 1 : 0 } : d)
    );
    const res = await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!data.success) {
      setDocuments((prev) =>
        prev.map((d) => d.id === doc.id ? { ...d, status: doc.status, checked: doc.checked } : d)
      );
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>Loading...</div>;
  }

  const score = readiness?.score ?? 0;
  const ringColor = score >= 7 ? '#166534' : score >= 4 ? '#d97706' : '#dc2626';

  return (
    <div>
      {/* Readiness Score */}
      <div style={s.card}>
        <div style={s.ringCenter}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={ringColor} strokeWidth="8"
              strokeDasharray={`${(score / 10) * 314.16} 314.16`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="56" textAnchor="middle" fontSize="32" fontWeight="700" fill="#1a1a1a">
              {score}
            </text>
            <text x="60" y="76" textAnchor="middle" fontSize="12" fill="#6b7280">
              out of 10
            </text>
          </svg>
        </div>

        <div style={s.criteriaList}>
          {readiness?.criteria.map((c) => (
            <div key={c.id} style={s.criterionRow}>
              <span style={{ ...s.icon, color: c.pass ? '#166534' : '#dc2626' }}>
                {c.pass ? '\u2713' : '\u2717'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={s.criterionLabel}>{c.label}</div>
                <div style={s.criterionDetail}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Borrowing Capacity */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={s.sectionTitle}>Estimated Borrowing Capacity</h2>
        <div style={s.capacityGrid}>
          <CapacityCard
            scenario="Conservative"
            amount={425000}
            detail="Based on minimum income verification and higher expenses"
            color="#dc2626"
          />
          <CapacityCard
            scenario="Moderate"
            amount={600000}
            detail="Based on standard income verification with clean banking"
            color="#d97706"
          />
          <CapacityCard
            scenario="Strong"
            amount={780000}
            detail="Based on full income verification, clean banking, and low expenses"
            color="#166534"
          />
        </div>
      </div>

      {/* Documents Checklist */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={s.sectionTitle}>Documents Checklist</h2>
        <div style={s.card}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
            {documents.filter((d) => d.required_for_preapproval && d.status === 'obtained').length} of {documents.filter((d) => d.required_for_preapproval).length} required documents obtained
          </div>
          {documents.map((doc, i) => (
            <div
              key={doc.id}
              onClick={() => cycleStatus(doc)}
              style={{
                ...s.docRow,
                borderBottom: i < documents.length - 1 ? '1px solid #f3f4f6' : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                ...(doc.status === 'obtained'
                  ? { background: '#166534', color: 'white' }
                  : doc.status === 'in_progress'
                  ? { background: '#fffbeb', border: '2px solid #f59e0b', color: '#f59e0b' }
                  : { background: '#f3f4f6', border: '2px solid #d1d5db', color: '#9ca3af' }),
              }}>
                {doc.status === 'obtained' && <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{'\u2713'}</span>}
                {doc.status === 'in_progress' && <span style={{ fontSize: '0.625rem', fontWeight: 700 }}>{'\u25CF'}</span>}
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' as const }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: doc.status === 'obtained' ? '#9ca3af' : '#374151',
                  textDecoration: doc.status === 'obtained' ? 'line-through' : 'none',
                }}>
                  {doc.label}
                </span>
                {doc.required_for_preapproval ? (
                  <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px' }}>Required</span>
                ) : null}
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#9ca3af', flexShrink: 0 }}>
                {doc.status === 'not_started' ? 'Not started' : doc.status === 'in_progress' ? 'In progress' : 'Obtained'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CapacityCard({ scenario, amount, detail, color }: {
  scenario: string; amount: number; detail: string; color: string;
}) {
  return (
    <div style={s.capCard}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color, textTransform: 'uppercase' as const, letterSpacing: '0.025em' }}>
        {scenario}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', margin: '0.25rem 0' }}>
        {formatCurrency(amount)}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{detail}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: 'white', border: '1px solid #e8e6df', borderRadius: 12, padding: '1.25rem' },
  ringCenter: { display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' },
  criteriaList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  criterionRow: { display: 'flex', gap: '0.625rem', alignItems: 'flex-start' },
  icon: { fontSize: '1rem', fontWeight: 700, width: 20, flexShrink: 0 },
  criterionLabel: { fontSize: '0.875rem', fontWeight: 500, color: '#374151' },
  criterionDetail: { fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 },
  sectionTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.125rem',
    color: '#1a1a1a', marginBottom: '0.75rem',
  },
  capacityGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem',
  },
  capCard: {
    background: 'white', border: '1px solid #e8e6df', borderRadius: 12, padding: '1.25rem',
  },
  docRow: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0',
    userSelect: 'none' as const,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, border: '2px solid #d1d5db',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background 0.15s, border-color 0.15s',
  },
};
