import { useState } from 'react';
import {
  INCURRED_EXPENSES, INCURRED_AS_AT, sumExpenses, type PrepayableItem,
} from '../data/expenses';
import { fmt } from '../lib/format';

type SectionId = 'incurred' | 'prepayable';

const incurredTotal = sumExpenses(INCURRED_EXPENSES);

interface Props {
  prepayables: PrepayableItem[];
  onAddPrepayable: (item: string, amount: number) => void;
  onRemovePrepayable: (id: string) => void;
}

export default function ExpenseAccordion({ prepayables, onAddPrepayable, onRemovePrepayable }: Props) {
  // Prepayable is open by default - it's the editable section the user manages.
  const [open, setOpen] = useState<Set<SectionId>>(new Set(['prepayable']));

  const toggle = (id: SectionId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const prepayableTotal = sumExpenses(prepayables);

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
          subtitle="Bring-forward deductions you can add to or trim"
          total={prepayableTotal}
          isOpen={open.has('prepayable')}
          onToggle={toggle}
        >
          {prepayables.map((e) => (
            <Row
              key={e.id}
              label={e.item}
              amount={e.amount}
              onRemove={() => onRemovePrepayable(e.id)}
            />
          ))}
          <AddRow onAdd={onAddPrepayable} />
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
  label, amount, onRemove,
}: {
  label: string;
  amount: number;
  onRemove?: () => void;
}) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowRight}>
        <span style={s.rowAmount}>{fmt(amount)}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} style={s.removeBtn} aria-label={`Remove ${label}`}>
            &times;
          </button>
        )}
      </span>
    </div>
  );
}

function AddRow({ onAdd }: { onAdd: (item: string, amount: number) => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const parsedAmount = Number(amount);
  const canAdd = name.trim() !== '' && parsedAmount > 0;

  const submit = () => {
    if (!canAdd) return;
    onAdd(name.trim(), parsedAmount);
    setName('');
    setAmount('');
  };

  return (
    <div style={s.addRow}>
      <input
        type="text"
        value={name}
        placeholder="Add an item"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        style={s.addName}
      />
      <div style={s.addAmountWrap}>
        <span style={s.addPrefix}>$</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          placeholder="0"
          min={0}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          style={s.addAmount}
        />
      </div>
      <button type="button" onClick={submit} disabled={!canAdd} style={{ ...s.addBtn, ...(canAdd ? {} : s.addBtnDisabled) }}>
        Add
      </button>
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
  rowLabel: { color: '#57534e', flex: 1 },
  rowRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  rowAmount: { fontFamily: "'SF Mono', Menlo, monospace", color: '#1c1917' },
  removeBtn: {
    border: 'none', background: 'transparent', color: '#a8a29e', cursor: 'pointer',
    fontSize: 16, lineHeight: 1, padding: '0 2px', borderRadius: 4,
  },
  addRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px dashed #e8e6df' },
  addName: {
    flex: 1, minWidth: 0, fontSize: 12, padding: '6px 8px', borderRadius: 6,
    border: '1px solid #e8e6df', outline: 'none', color: '#1c1917',
  },
  addAmountWrap: { display: 'flex', alignItems: 'center', gap: 2, border: '1px solid #e8e6df', borderRadius: 6, padding: '0 8px' },
  addPrefix: { color: '#a8a29e', fontSize: 12 },
  addAmount: {
    width: 72, textAlign: 'right', fontSize: 12, padding: '6px 0', border: 'none',
    outline: 'none', fontFamily: "'SF Mono', Menlo, monospace", color: '#1c1917',
  },
  addBtn: {
    fontSize: 12, fontWeight: 600, color: '#fff', background: '#166534', border: 'none',
    borderRadius: 6, padding: '7px 14px', cursor: 'pointer', flexShrink: 0,
  },
  addBtnDisabled: { background: '#d6d3d1', cursor: 'not-allowed' },
};
