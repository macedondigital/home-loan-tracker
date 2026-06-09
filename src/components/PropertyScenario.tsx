import type { Scenario, ScenarioResult } from '../lib/scenario';
import { SUPER_TOTAL_CAP, SUPER_CARRY_FORWARD } from '../lib/tax';
import RangeInput from './RangeInput';
import { IconHome, IconPiggy, IconReceipt, IconBuilding } from './scenario-icons';

const fmt = (n: number): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  return sign + new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
  }).format(Math.abs(n));
};

const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
  return fmt(n);
};

interface Props {
  scenario: Scenario;
  result: ScenarioResult;
  onFieldChange: (field: 'propertyTarget' | 'superContrib' | 'prepaid' | 'bucket', value: number) => void;
  onNameChange: (value: string) => void;
  onDescChange: (value: string) => void;
}

export default function PropertyScenario({
  scenario, result, onFieldChange, onNameChange, onDescChange,
}: Props) {
  const surplus = result.canAffordPurchase && result.bufferOk30June;
  const deficit = !result.canAffordPurchase;

  const cardStyle: React.CSSProperties = {
    ...s.card,
    ...(surplus ? { borderColor: '#86efac', borderWidth: 1.5 } : null),
    ...(deficit ? { borderColor: '#fecaca', borderWidth: 1.5, background: '#fef2f2' } : null),
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={s.header}>
        <input style={s.name} value={scenario.name} onChange={(e) => onNameChange(e.target.value)} aria-label="Scenario name" />
        <input style={s.desc} value={scenario.description} onChange={(e) => onDescChange(e.target.value)} aria-label="Scenario description" />
        <div style={s.badges}>
          {result.canAffordPurchase
            ? <span style={{ ...s.badge, background: '#dcfce7', color: '#166534' }}>{'✓'} Affordable</span>
            : <span style={{ ...s.badge, background: '#fef2f2', color: '#dc2626' }}>{'✗'} Cash shortfall</span>}
          {!result.bufferOk30June && (
            <span style={{ ...s.badge, background: '#fef3c7', color: '#b45309' }}>{'⚠'} Buffer breach at 30 June</span>
          )}
        </div>
      </div>

      {/* Property */}
      <div style={{ ...s.section, background: 'linear-gradient(to bottom, #f8fafc 0%, #fff 100%)' }}>
        <RangeInput
          label={<><IconHome size={12} /><span style={{ fontWeight: 600, color: '#1c1917' }}>Property target</span></>}
          value={scenario.propertyTarget}
          min={500000} max={1000000} step={5000} prefix="$" size="sm"
          onChange={(v) => onFieldChange('propertyTarget', v)}
        />
        <div style={{ ...s.breakdown, marginTop: 12 }}>
          <Row label="Loan (98% FHG)" value={fmt(result.loan)} />
          <Row label="Deposit (2%)" value={fmt(result.deposit)} />
          <Row label={<>Stamp duty <span style={{ fontSize: 10, color: '#a8a29e' }}>(full duty)</span></>} value={fmt(result.stampDuty)} />
          <Row label="Other costs" value={fmt(result.cashNeeded - result.deposit - result.stampDuty)} />
          <Row label="Total cash needed" value={fmt(result.cashNeeded)} emphasis divider />
          <Row label="Monthly repayment" value={`${fmt(result.monthlyRepayment)}/mo`} />
        </div>
      </div>

      {/* Tax planning */}
      <div style={s.section}>
        <div style={s.sectionLabel}>Tax planning</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RangeInput
            label={<><IconPiggy size={12} />Super contribution</>}
            value={scenario.superContrib} min={0} max={SUPER_TOTAL_CAP} step={500} prefix="$" size="sm"
            hint={`Cap ${fmtCompact(SUPER_TOTAL_CAP)} (carry-forward ${fmtCompact(SUPER_CARRY_FORWARD)})`}
            onChange={(v) => onFieldChange('superContrib', v)}
          />
          <RangeInput
            label={<><IconReceipt size={12} />Prepaid expenses</>}
            value={scenario.prepaid} min={0} max={50000} step={500} prefix="$" size="sm"
            hint="~$22.5k confirmed legitimate"
            onChange={(v) => onFieldChange('prepaid', v)}
          />
          <RangeInput
            label={<><IconBuilding size={12} />Bucket company</>}
            value={scenario.bucket} min={0} max={200000} step={500} prefix="$" size="sm"
            hint="Sarah advised against. Default $0."
            onChange={(v) => onFieldChange('bucket', v)}
          />
        </div>
      </div>

      {/* Tax breakdown */}
      <div style={s.section}>
        <div style={s.sectionLabel}>Tax breakdown</div>
        <div style={s.breakdown}>
          <Row label="Personal taxable" value={fmt(result.personalTaxable)} />
          <Row label="Income tax + Medicare" value={fmt(result.personalTotal)} />
          {scenario.superContrib > 0 && <Row label="Super 15%" value={fmt(result.superTax)} />}
          {result.div293 > 0 && <Row label="Div 293" value={fmt(result.div293)} warning />}
          {scenario.bucket > 0 && <Row label="Bucket 25%" value={fmt(result.bucketTax)} />}
          <Row label="Total tax" value={fmt(result.totalTax)} emphasis divider />
          <Row
            label={<span style={{ color: '#166534' }}>Tax saved vs baseline</span>}
            value={<span style={{ color: '#166534' }}>{result.taxSaved >= 0 ? '-' : '+'}{fmt(Math.abs(result.taxSaved))}</span>}
          />
        </div>
      </div>

      {/* Cash flow result */}
      <div style={{ padding: '14px 16px', marginTop: 'auto' }}>
        <div style={s.sectionLabel}>Cash flow to settlement</div>
        <div style={s.breakdown}>
          <Row label="Business bank at 30 June" value={fmt(result.businessBankEnd)} />
          <Row label="Personal cash at 30 June" value={fmt(result.personalCashEnd)} />
          <Row label="Total cash at 30 June" value={fmt(result.totalCashAt30June)} divider />
          <Row label="+ Cash growth Jul-settlement" value={`+${fmt(result.cashGrowthToSettle)}`} />
          <Row label="Cash at settlement" value={fmt(result.totalCashAtSettlement)} emphasis />
          <Row label="- Min buffer to retain" value={`-${fmt(result.totalCashAtSettlement - result.cashAvailableForPurchase)}`} />
          <Row label="- Property cash needed" value={`-${fmt(result.cashNeeded)}`} />
        </div>
        <div style={s.headline}>
          <span style={s.headlineLabel}>Surplus / Deficit</span>
          <span style={{ ...s.headlineValue, color: result.surplus >= 0 ? '#166534' : '#dc2626' }}>
            {result.surplus >= 0 ? `+${fmt(result.surplus)}` : fmt(result.surplus)}
          </span>
        </div>
        {!result.bufferOk30June && (
          <div style={s.pillFail}>
            {'✗'} Business bank at 30 June is {fmt(Math.abs(result.bufferAmount30June))} below buffer
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label, value, emphasis, divider, warning,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasis?: boolean;
  divider?: boolean;
  warning?: boolean;
}) {
  const color = warning ? '#b45309' : emphasis ? '#1c1917' : undefined;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', fontSize: 12,
      ...(divider ? { borderTop: '1px solid #f5f5f4', paddingTop: 4, marginTop: 2 } : null),
    }}>
      <span style={{ color: color ?? '#57534e', fontWeight: emphasis ? 600 : 400 }}>{label}</span>
      <span style={{
        fontFamily: "'SF Mono', Menlo, monospace", color: color ?? '#1c1917', fontWeight: emphasis ? 600 : 400,
      }}>{value}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #e8e6df', borderRadius: 12,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: { padding: '14px 16px', borderBottom: '1px solid #f5f5f4' },
  name: {
    fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 600, color: '#1c1917',
    background: 'transparent', border: 'none', width: '100%', outline: 'none',
    padding: '2px 4px', marginLeft: -4, borderRadius: 4, display: 'block',
  },
  desc: {
    fontSize: 11, color: '#78716c', background: 'transparent', border: 'none',
    width: '100%', outline: 'none', padding: '2px 4px', marginLeft: -4,
    borderRadius: 4, display: 'block', marginTop: 2,
  },
  badges: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, minHeight: 18 },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
    borderRadius: 999, fontSize: 10, fontWeight: 600,
  },
  section: { padding: '12px 16px', borderBottom: '1px solid #f5f5f4' },
  sectionLabel: {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#78716c', marginBottom: 8,
  },
  breakdown: { display: 'flex', flexDirection: 'column', gap: 4 },
  headline: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    padding: '8px 0', borderTop: '1px solid #e8e6df', marginTop: 6,
  },
  headlineLabel: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c',
  },
  headlineValue: { fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 600 },
  pillFail: {
    marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', color: '#dc2626',
  },
};
