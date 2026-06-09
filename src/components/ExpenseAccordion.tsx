import { useState } from 'react';
import {
  INCURRED_EXPENSES, PREPAYABLE_EXPENSES, INCURRED_AS_AT, sumExpenses,
} from '../data/expenses';
import { fmt } from '../lib/format';

type SectionId = 'incurred' | 'prepayable';

const incurredTotal = sumExpenses(INCURRED_EXPENSES);
const prepayableTotal = sumExpenses(PREPAYABLE_EXPENSES);

export default function ExpenseAccordion() {
  const [open, setOpen] = useState<Set<SectionId>>(new Set());

  const toggle = (id: SectionId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={s.cardHeading}>Where the money goes</div>
      <div style={s.card}>
        <p style={s.note}>
          Every dollar of deductible spend or super contribution cuts your tax, but it
          also cuts the cash available for your deposit. Prepaid expenses are costs you
          would pay anyway, brought forward. Super saves the most tax but locks the cash
          away until retirement. A bucket company is ruled out (Sarah's advice plus the
          2028 anti-bucket rules).
        </p>

        <Section
          id="incurred"
          title="Already incurred (FY25-26)"
          subtitle={`Operating expenses as at ${INCURRED_AS_AT}`}
          total={incurredTotal}
          isOpen={open.has('incurred')}
          onToggle={toggle}
        >
          {INCURRED_EXPENSES.map((e) => (
            <Row key={e.category} label={e.category} amount={e.amount} />
          ))}
        </Section>

        <Section
          id="prepayable"
          title="Prepayable before 30 June"
          subtitle="Confirmed bring-forward deductions"
          total={prepayableTotal}
          isOpen={open.has('prepayable')}
          onToggle={toggle}
        >
          {PREPAYABLE_EXPENSES.map((e) => (
            <Row
              key={e.item}
              label={e.item}
              amount={e.amount}
              badge={e.status === 'incurred'
                ? { text: 'Already bought', bg: '#f5f5f4', color: '#78716c' }
                : { text: 'Planned', bg: '#dcfce7', color: '#166534' }}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({
  id, title, subtitle, total, isOpen, onToggle, children,
}: {
  id: SectionId;
  title: string;
  subtitle: string;
  total: number;
  isOpen: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: '1px solid #f5f5f4' }}>
      <div
        onClick={() => onToggle(id)}
        style={s.sectionHeader}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(id); } }}
      >
        <span style={s.chevron}>{isOpen ? '▼' : '▶'}</span>
        <div style={{ flex: 1 }}>
          <div style={s.sectionTitle}>{title}</div>
          <div style={s.sectionSubtitle}>{subtitle}</div>
        </div>
        <span style={s.sectionTotal}>{fmt(total)}</span>
      </div>
      {isOpen && <div style={s.rows}>{children}</div>}
    </div>
  );
}

function Row({
  label, amount, badge,
}: {
  label: string;
  amount: number;
  badge?: { text: string; bg: string; color: string };
}) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>
        {label}
        {badge && (
          <span style={{ ...s.badge, background: badge.bg, color: badge.color }}>{badge.text}</span>
        )}
      </span>
      <span style={s.rowAmount}>{fmt(amount)}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cardHeading: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#78716c', marginBottom: 8,
  },
  card: { background: '#fff', border: '1px solid #e8e6df', borderRadius: 12, padding: 16 },
  note: { fontSize: 13, color: '#57534e', lineHeight: 1.5, marginBottom: 14, marginTop: 0 },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
    cursor: 'pointer', userSelect: 'none', outline: 'none',
  },
  chevron: { fontSize: 10, color: '#9ca3af', width: 12, flexShrink: 0 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#1c1917' },
  sectionSubtitle: { fontSize: 11, color: '#a8a29e', marginTop: 2 },
  sectionTotal: {
    fontFamily: "'SF Mono', Menlo, monospace", fontSize: 15, fontWeight: 600,
    color: '#1c1917', flexShrink: 0,
  },
  rows: { paddingBottom: 12, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 12 },
  rowLabel: { color: '#57534e', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowAmount: { fontFamily: "'SF Mono', Menlo, monospace", color: '#1c1917', flexShrink: 0 },
  badge: {
    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
  },
};
