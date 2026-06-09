import type { SharedInputs as SharedInputsState } from '../lib/scenario';
import { FORECAST_MONTHS } from '../lib/scenario';
import { fmt } from '../lib/format';
import RangeInput from './RangeInput';
import { IconTrend, IconCalendar, IconShield } from './scenario-icons';

interface Props {
  shared: SharedInputsState;
  onChange: (field: keyof SharedInputsState, value: number) => void;
}

const MONTHS: { field: keyof SharedInputsState; label: string }[] = [
  { field: 'revenueJul', label: 'July' },
  { field: 'revenueAug', label: 'August' },
  { field: 'revenueSep', label: 'September' },
  { field: 'revenueOct', label: 'October' },
];

export default function RevenueForecast({ shared, onChange }: Props) {
  const totalRevenue = shared.revenueJul + shared.revenueAug + shared.revenueSep + shared.revenueOct;
  const totalOutgoings = shared.monthlyOutgoings * FORECAST_MONTHS;
  const net = totalRevenue - totalOutgoings;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={s.cardHeading}>Revenue forecast to settlement (Jul-Oct 2026)</div>
      <div style={s.card}>
        <div style={s.monthsGrid}>
          {MONTHS.map((m) => (
            <RangeInput
              key={m.field}
              label={<><IconCalendar size={12} />{m.label}</>}
              value={shared[m.field]}
              min={0}
              max={60000}
              step={1000}
              prefix="$"
              size="sm"
              onChange={(v) => onChange(m.field, v)}
            />
          ))}
        </div>

        <div style={s.divider} />

        <div style={s.lowerGrid}>
          <RangeInput
            label={<><IconTrend size={13} />Monthly outgoings</>}
            value={shared.monthlyOutgoings}
            min={0}
            max={40000}
            step={1000}
            prefix="$"
            hint="Business costs (~$7k/mo) + living + tax set-aside. Netted off forecast revenue."
            onChange={(v) => onChange('monthlyOutgoings', v)}
          />
          <RangeInput
            label={<><IconShield size={13} />Min business buffer</>}
            value={shared.minBuffer}
            min={0}
            max={100000}
            step={1000}
            prefix="$"
            hint="Cash to keep in the business as an ongoing safety buffer."
            onChange={(v) => onChange('minBuffer', v)}
          />
        </div>

        <div style={s.summary}>
          <span style={s.summaryText}>
            Total revenue {fmt(totalRevenue)} &minus; outgoings {fmt(totalOutgoings)} =
          </span>
          <span style={{ ...s.summaryValue, color: net >= 0 ? '#166534' : '#dc2626' }}>
            {net >= 0 ? '+' : ''}{fmt(net)} net cash to settlement
          </span>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cardHeading: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#78716c', marginBottom: 8,
  },
  card: { background: '#fff', border: '1px solid #e8e6df', borderRadius: 12, padding: 16 },
  monthsGrid: {
    display: 'grid', gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  },
  divider: { borderTop: '1px solid #f5f5f4', margin: '16px 0' },
  lowerGrid: {
    display: 'grid', gap: 20,
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  },
  summary: {
    marginTop: 16, paddingTop: 14, borderTop: '1px solid #e8e6df',
    display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6,
  },
  summaryText: { fontSize: 13, color: '#57534e' },
  summaryValue: { fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 600 },
};
