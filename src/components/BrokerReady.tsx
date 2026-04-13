import { useState, useEffect, useRef, useCallback } from 'react';

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

interface IncomeRecord {
  financial_year: string;
  trust_distribution: number;
  personal_taxable_income: number;
  add_back_depreciation: number;
  add_back_super: number;
  add_back_one_off: number;
  add_back_other: number;
}

interface IncomeAssessment {
  fy24: { trust_distribution: number; add_backs_total: number; assessable: number } | null;
  fy25: { trust_distribution: number; add_backs_total: number; assessable: number } | null;
  lender_annual_income: number;
  lender_monthly_income: number;
  data_completeness: 'full' | 'partial' | 'empty';
  income_sufficient_for_target: boolean;
}

interface BorrowingCapacity {
  max_loan: number;
  monthly_income: number;
  income_source: 'trust_assessment' | 'fallback_drawings';
  lender_annual_income: number;
  actual_monthly_expenses: number;
  hem_benchmark: number;
  declared_expenses: number;
  monthly_surplus: number;
  max_monthly_repayment: number;
  assessment_rate: number;
  target_loan: number;
  target_achievable: boolean;
  income_needed_for_target: number;
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
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [assessment, setAssessment] = useState<IncomeAssessment | null>(null);
  const [capacity, setCapacity] = useState<BorrowingCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAssessment = useCallback(async () => {
    const [assessRes, capRes] = await Promise.all([
      fetch('/api/income/assessment').then((r) => r.json()),
      fetch('/api/borrowing-capacity').then((r) => r.json()),
    ]);
    if (assessRes.success) setAssessment(assessRes.data);
    if (capRes.success) setCapacity(capRes.data);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/readiness').then((r) => r.json()),
      fetch('/api/documents').then((r) => r.json()),
      fetch('/api/income').then((r) => r.json()),
      fetch('/api/income/assessment').then((r) => r.json()),
      fetch('/api/borrowing-capacity').then((r) => r.json()),
    ]).then(([readyRes, docsRes, incomeRes, assessRes, capRes]) => {
      if (readyRes.success) setReadiness(readyRes.data);
      if (docsRes.success) setDocuments(docsRes.data);
      if (incomeRes.success) setIncomeRecords(incomeRes.data);
      if (assessRes.success) setAssessment(assessRes.data);
      if (capRes.success) setCapacity(capRes.data);
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

  const updateIncomeField = (fy: string, field: keyof IncomeRecord, value: string) => {
    const numVal = parseFloat(value) || 0;
    setIncomeRecords((prev) =>
      prev.map((r) => r.financial_year === fy ? { ...r, [field]: numVal } : r)
    );
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const record = incomeRecords.find((r) => r.financial_year === fy);
      if (!record) return;
      const updated = { ...record, [field]: numVal };
      await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      await fetchAssessment();
    }, 500);
  };

  const getRecord = (fy: string): IncomeRecord => {
    return incomeRecords.find((r) => r.financial_year === fy) || {
      financial_year: fy, trust_distribution: 0, personal_taxable_income: 0,
      add_back_depreciation: 0, add_back_super: 0, add_back_one_off: 0, add_back_other: 0,
    };
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

      {/* Lender Income Assessment */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={s.sectionTitle}>Lender Income Assessment</h2>
        {assessment?.data_completeness === 'empty' ? (
          <div style={{ ...s.card, background: '#f8fafc' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>
              Enter your trust distribution and add back figures from your tax returns to calculate what a broker will assess as your income.
            </div>
          </div>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginTop: assessment?.data_completeness === 'empty' ? '0.75rem' : 0 }}>
          {['FY24', 'FY25'].map((fy) => {
            const rec = getRecord(fy);
            return (
              <div key={fy} style={s.card}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>{fy}</div>
                <IncomeInput label="Trust distribution" value={rec.trust_distribution} onChange={(v) => updateIncomeField(fy, 'trust_distribution', v)} />
                <IncomeInput label="Add back: Depreciation" value={rec.add_back_depreciation} onChange={(v) => updateIncomeField(fy, 'add_back_depreciation', v)} />
                <IncomeInput label="Add back: Super contributions" value={rec.add_back_super} onChange={(v) => updateIncomeField(fy, 'add_back_super', v)} />
                <IncomeInput label="Add back: One off expenses" value={rec.add_back_one_off} onChange={(v) => updateIncomeField(fy, 'add_back_one_off', v)} />
                <IncomeInput label="Add back: Other" value={rec.add_back_other} onChange={(v) => updateIncomeField(fy, 'add_back_other', v)} />
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Assessable income</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1a1a1a' }}>
                    {formatCurrency(rec.trust_distribution + rec.add_back_depreciation + rec.add_back_super + rec.add_back_one_off + rec.add_back_other)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {assessment && assessment.data_completeness !== 'empty' && (
          <div style={{ ...s.card, marginTop: '0.75rem', background: assessment.lender_annual_income >= 150000 ? '#f0fdf4' : assessment.lender_annual_income >= 100000 ? '#fffbeb' : '#fef2f2' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1a1a1a' }}>
              Lender assessed income (lower of 2 years): {formatCurrency(assessment.lender_annual_income)}/year ({formatCurrency(assessment.lender_monthly_income)}/month)
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: assessment.lender_annual_income >= 150000 ? '#166534' : assessment.lender_annual_income >= 100000 ? '#f59e0b' : '#dc2626',
              }} />
              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                {assessment.lender_annual_income >= 150000 ? 'Income likely sufficient for $735K target' :
                 assessment.lender_annual_income >= 100000 ? 'Income may be tight for $735K target' :
                 'Income likely insufficient for $735K target'}
              </span>
            </div>
            {assessment.data_completeness === 'partial' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#d97706', background: '#fffbeb', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                Only one year of data. Most lenders require two years for trust income. This restricts your lender panel.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Borrowing Capacity */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={s.sectionTitle}>Estimated Borrowing Capacity</h2>
        {capacity && (
          <div style={s.card}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.25rem' }}>
              {formatCurrency(capacity.max_loan)}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              Based on {formatCurrency(capacity.lender_annual_income)} annual assessed income at {Math.round(capacity.assessment_rate * 100)}% buffer rate
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1rem', color: capacity.target_achievable ? '#166534' : '#dc2626' }}>
                {capacity.target_achievable ? '\u2713' : '\u2717'}
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: capacity.target_achievable ? '#166534' : '#dc2626' }}>
                Target: {formatCurrency(capacity.target_loan)}
              </span>
            </div>

            {!capacity.target_achievable && (
              <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.8125rem', color: '#991b1b' }}>
                You would need ~{formatCurrency(capacity.income_needed_for_target)} annual income to borrow {formatCurrency(capacity.target_loan)}
              </div>
            )}

            {capacity.income_source === 'fallback_drawings' && (
              <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.8125rem', color: '#92400e' }}>
                Using $6,000/month from owner's drawings. Enter your trust income data in the section above for an accurate estimate.
              </div>
            )}

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' }}>
                <BreakdownRow label="Monthly income" value={formatCurrency(capacity.monthly_income)} />
                <BreakdownRow label="Declared expenses" value={`${formatCurrency(capacity.declared_expenses)} ${capacity.actual_monthly_expenses < capacity.hem_benchmark ? '(HEM floor)' : '(actual)'}`} />
                <BreakdownRow label="Monthly surplus" value={formatCurrency(capacity.monthly_surplus)} />
                <BreakdownRow label={`Max repayment (at ${Math.round(capacity.assessment_rate * 100)}%)`} value={formatCurrency(capacity.max_monthly_repayment)} />
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
              This is an estimate only. Your broker Simon will run a formal serviceability assessment with specific lender criteria.
            </div>
          </div>
        )}
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

function IncomeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(value > 0 ? String(value) : '');

  useEffect(() => {
    if (!focused) {
      setDisplay(value > 0 ? String(value) : '');
    }
  }, [value, focused]);

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: 2 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          placeholder="0"
          onFocus={() => { setFocused(true); setDisplay(value > 0 ? String(value) : ''); }}
          onBlur={() => { setFocused(false); }}
          onChange={(e) => { setDisplay(e.target.value); onChange(e.target.value); }}
          style={{ width: '100%', padding: '0.375rem 0.5rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: 6, outline: 'none' }}
        />
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#374151' }}>{value}</span>
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
