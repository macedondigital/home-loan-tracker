import type { ReactNode } from 'react';
import type { SharedInputs as SharedInputsState } from '../lib/scenario';
import RangeInput from './RangeInput';
import {
  IconTrust, IconWallet, IconBuilding, IconTrend, IconCalendar, IconShield,
} from './scenario-icons';

interface FieldConfig {
  field: keyof SharedInputsState;
  label: string;
  icon: ReactNode;
  prefix?: string;
  suffix?: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}

interface Group {
  heading: string;
  fields: FieldConfig[];
}

const GROUPS: Group[] = [
  {
    heading: 'Income & cash position',
    fields: [
      {
        field: 'trustProfit', label: 'Trust net profit (FY25-26)', icon: <IconTrust />, prefix: '$',
        min: 100000, max: 500000, step: 5000,
        hint: '$308k YTD accrual through 9 June. Updated estimate accounts for late-June EOFY spending.',
      },
      {
        field: 'personalCash', label: 'Personal cash on hand', icon: <IconWallet />, prefix: '$',
        min: 0, max: 200000, step: 5000,
        hint: 'Funds super contribution first. Top up from business if needed.',
      },
      {
        field: 'businessBank', label: 'Business bank (30 June projected)', icon: <IconBuilding />, prefix: '$',
        min: 0, max: 300000, step: 5000,
        hint: '9 June actual: $120k. Projection adds expected June revenue net of spending.',
      },
    ],
  },
  {
    heading: 'Cash growth to settlement',
    fields: [
      {
        field: 'monthlyCashGrowth', label: 'Net cash savings per month (post 30 June)', icon: <IconTrend />, prefix: '$',
        min: 0, max: 30000, step: 1000,
        hint: 'Avg monthly cash retention after personal tax, drawings, business costs.',
      },
      {
        field: 'monthsToSettle', label: 'Months to settlement', icon: <IconCalendar />, suffix: 'months',
        min: 1, max: 8, step: 1,
        hint: 'Jul-Oct = 4 months. Push higher if settlement slips.',
      },
      {
        field: 'minBuffer', label: 'Min business buffer', icon: <IconShield />, prefix: '$',
        min: 0, max: 100000, step: 1000,
        hint: 'Cash to keep in business bank as ongoing safety buffer.',
      },
    ],
  },
  {
    heading: 'Loan settings',
    fields: [
      {
        field: 'interestRate', label: 'Interest rate', icon: null, suffix: '%',
        min: 3, max: 10, step: 0.1,
        hint: 'ANZ owner-occupier variable, ~6.5% as of June 2026.',
      },
      {
        field: 'loanYears', label: 'Loan term', icon: null, suffix: 'years',
        min: 15, max: 30, step: 1,
        hint: 'Standard term. Your aggressive paydown plan overrides this.',
      },
      {
        field: 'otherCosts', label: 'Other purchase costs', icon: null, prefix: '$',
        min: 3000, max: 15000, step: 500,
        hint: 'Conveyancing, inspections, title transfer, mortgage registration.',
      },
    ],
  },
];

interface Props {
  shared: SharedInputsState;
  onChange: (field: keyof SharedInputsState, value: number) => void;
}

export default function SharedInputs({ shared, onChange }: Props) {
  return (
    <div>
      {GROUPS.map((group) => (
        <div key={group.heading} style={{ marginBottom: 16 }}>
          <div style={s.cardHeading}>{group.heading}</div>
          <div style={s.card}>
            <div style={s.grid}>
              {group.fields.map((f) => (
                <RangeInput
                  key={f.field}
                  label={<>{f.icon}{f.label}</>}
                  value={shared[f.field]}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  prefix={f.prefix}
                  suffix={f.suffix}
                  hint={f.hint}
                  onChange={(v) => onChange(f.field, v)}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cardHeading: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#78716c', marginBottom: 8,
  },
  card: { background: '#fff', border: '1px solid #e8e6df', borderRadius: 12, padding: 16 },
  grid: {
    display: 'grid', gap: 20,
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  },
};
