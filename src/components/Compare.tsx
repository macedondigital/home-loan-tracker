import { useState, useEffect, useRef } from 'react';
import { project, HORIZON_YEARS, type CompareInputs } from '../lib/projection';
import { fmt, fmtCompact } from '../lib/format';
import RangeInput from './RangeInput';

const STORAGE_KEY = 'hbo-compare-v1';

const DEFAULTS: CompareInputs = {
  lumpSum: 100000,
  offsetRatePct: 6,
  superRatePct: 9,
  superContribTaxPct: 15,
};

const OFFSET_COLOR = '#2563eb';
const SUPER_COLOR = '#166534';

export default function Compare() {
  const [inputs, setInputs] = useState<CompareInputs>(DEFAULTS);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInputs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore corrupt storage
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      // ignore
    }
  }, [inputs]);

  const set = (field: keyof CompareInputs, value: number) =>
    setInputs((prev) => ({ ...prev, [field]: value }));

  const result = project(inputs);
  const { series, crossoverYear, offsetStart, superStart, finalDiff } = result;

  return (
    <div>
      <header style={s.header}>
        <div style={s.eyebrow}>
          <span style={{ color: '#166534' }}>Offset vs super</span>
          <span>{'·'}</span>
          <span>30-year comparison</span>
        </div>
        <h1 style={s.h1}>Pay down the loan, or build super?</h1>
        <p style={s.subtitle}>
          Where does a lump sum end up further ahead over time: in your home-loan offset
          (a tax-free return equal to your loan rate, always accessible), or in super
          (higher long-run growth, but taxed going in and locked until you retire)?
        </p>
      </header>

      <div style={s.cardHeading}>Assumptions</div>
      <div style={s.card}>
        <div style={s.grid}>
          <RangeInput
            label="Lump sum" value={inputs.lumpSum} min={0} max={300000} step={5000} prefix="$"
            hint="Cash you could put in offset, or contribute to super."
            onChange={(v) => set('lumpSum', v)}
          />
          <RangeInput
            label="Home loan / offset rate" value={inputs.offsetRatePct} min={3} max={10} step={0.1} suffix="%"
            hint="The offset earns this, tax-free."
            onChange={(v) => set('offsetRatePct', v)}
          />
          <RangeInput
            label="Super growth" value={inputs.superRatePct} min={0} max={15} step={0.5} suffix="%"
            hint="Long-run average, net of fees and earnings tax."
            onChange={(v) => set('superRatePct', v)}
          />
          <RangeInput
            label="Super contributions tax" value={inputs.superContribTaxPct} min={0} max={30} step={1} suffix="%"
            hint="15% concessional (30% with Div 293; 0% for after-tax contributions)."
            onChange={(v) => set('superContribTaxPct', v)}
          />
        </div>
        <div style={s.startRow}>
          <span><span style={{ ...s.dot, background: OFFSET_COLOR }} /> Into offset: <strong>{fmt(offsetStart)}</strong></span>
          <span><span style={{ ...s.dot, background: SUPER_COLOR }} /> Into super: <strong>{fmt(superStart)}</strong>{inputs.superContribTaxPct > 0 ? ` (after ${inputs.superContribTaxPct}% tax)` : ''}</span>
        </div>
      </div>

      <div style={{ ...s.card, marginTop: 16 }}>
        <Verdict crossoverYear={crossoverYear} finalDiff={finalDiff} />
        <Chart series={series} crossoverYear={crossoverYear} />
        <div style={s.legend}>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: OFFSET_COLOR }} /> Offset @ {inputs.offsetRatePct}%</span>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: SUPER_COLOR }} /> Super @ {inputs.superRatePct}%</span>
        </div>
      </div>

      <div style={{ ...s.cardHeading, marginTop: 16 }}>At a glance</div>
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Year</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Offset</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Super</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Difference</th>
            </tr>
          </thead>
          <tbody>
            {[5, 10, 20, 30].map((y) => {
              const row = series[y];
              const ahead = row.diff >= 0;
              return (
                <tr key={y}>
                  <td style={s.td}>{y}</td>
                  <td style={{ ...s.tdNum }}>{fmt(row.offset)}</td>
                  <td style={{ ...s.tdNum }}>{fmt(row.super)}</td>
                  <td style={{ ...s.tdNum, color: ahead ? SUPER_COLOR : OFFSET_COLOR, fontWeight: 600 }}>
                    {ahead ? 'super +' : 'offset +'}{fmt(Math.abs(row.diff))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={s.footer}>
        <p>
          <strong style={s.footerStrong}>Liquidity matters more than the curves.</strong> Offset money
          is yours to use any time. Super is preserved until you reach your preservation age (around 60),
          so a paper win there is not cash you can spend on the house, school fees, or an emergency before
          then. Weigh the gap against when you actually need the money.
        </p>
        <p>
          <strong style={s.footerStrong}>Super is likely even better than shown.</strong> A concessional
          contribution also returns a tax deduction at your marginal rate (~47% this year), a one-off boost
          to the super side that these curves do not include. The contributions-tax input only captures the
          15% (or 30%) cost, not the deduction benefit.
        </p>
        <p>
          <strong style={s.footerStrong}>The rates are not equal in certainty.</strong> The offset return
          is your actual loan rate, guaranteed and tax-free. The super figure is a long-run average; real
          returns swing year to year and sequencing matters. Treat the crossover as indicative, not a promise.
        </p>
        <p>
          <strong style={s.footerStrong}>Not financial advice.</strong> Confirm the contributions-cap
          headroom, Div 293, and timing with Sarah before acting.
        </p>
      </div>
    </div>
  );
}

function Verdict({ crossoverYear, finalDiff }: { crossoverYear: number | null; finalDiff: number }) {
  let text: React.ReactNode;
  if (crossoverYear === null) {
    text = <>Offset stays ahead for the full {HORIZON_YEARS} years - by {fmt(Math.abs(finalDiff))} at year {HORIZON_YEARS}.</>;
  } else if (crossoverYear === 0) {
    text = <>Super is ahead from the start, and by year {HORIZON_YEARS} it leads by {fmt(finalDiff)}.</>;
  } else {
    text = <>Offset leads early; <strong>super overtakes at year {crossoverYear}</strong> and is ahead by {fmt(finalDiff)} at year {HORIZON_YEARS}.</>;
  }
  return <div style={s.verdict}>{text}</div>;
}

function Chart({ series, crossoverYear }: { series: { year: number; offset: number; super: number }[]; crossoverYear: number | null }) {
  const W = 640, H = 300;
  const padL = 56, padR = 16, padT = 16, padB = 30;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const plotW = x1 - x0, plotH = y1 - y0;

  const last = series[series.length - 1];
  const yMax = Math.max(last.offset, last.super) * 1.05 || 1;

  const xScale = (year: number) => x0 + (year / HORIZON_YEARS) * plotW;
  const yScale = (v: number) => y1 - (v / yMax) * plotH;

  const line = (key: 'offset' | 'super') =>
    series.map((p) => `${xScale(p.year).toFixed(1)},${yScale(p[key]).toFixed(1)}`).join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xTicks = [0, 5, 10, 15, 20, 25, 30];
  const showCross = crossoverYear !== null && crossoverYear > 0 && crossoverYear < HORIZON_YEARS;
  const crossX = showCross ? xScale(crossoverYear as number) : 0;
  const crossPt = showCross ? series[crossoverYear as number] : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Offset versus super over 30 years">
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={x0} y1={yScale(v)} x2={x1} y2={yScale(v)} stroke="#f5f5f4" strokeWidth={1} />
          <text x={x0 - 8} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#a8a29e">{fmtCompact(v)}</text>
        </g>
      ))}
      {xTicks.map((yr) => (
        <text key={yr} x={xScale(yr)} y={y1 + 18} textAnchor="middle" fontSize={10} fill="#a8a29e">{yr}</text>
      ))}
      <text x={(x0 + x1) / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="#78716c">Years</text>

      {showCross && crossPt && (
        <g>
          <line x1={crossX} y1={y0} x2={crossX} y2={y1} stroke="#d6d3d1" strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={crossX} cy={yScale(crossPt.super)} r={4} fill="#166534" />
          <text x={crossX} y={y0 + 12} textAnchor={crossoverYear! > HORIZON_YEARS / 2 ? 'end' : 'start'} fontSize={10} fontWeight={600} fill="#166534">
            {`Super overtakes · yr ${crossoverYear}`}
          </text>
        </g>
      )}

      <polyline points={line('offset')} fill="none" stroke={OFFSET_COLOR} strokeWidth={2} strokeLinejoin="round" />
      <polyline points={line('super')} fill="none" stroke={SUPER_COLOR} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { marginBottom: 16 },
  eyebrow: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500,
    color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  },
  h1: { fontFamily: 'Georgia, serif', fontSize: 28, color: '#1c1917', lineHeight: 1.2, fontWeight: 600, margin: 0 },
  subtitle: { color: '#57534e', marginTop: 4, fontSize: 14, maxWidth: 720, lineHeight: 1.5 },
  cardHeading: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: '#78716c', marginBottom: 8,
  },
  card: { background: '#fff', border: '1px solid #e8e6df', borderRadius: 12, padding: 16 },
  grid: { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' },
  startRow: {
    display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 16, paddingTop: 14,
    borderTop: '1px solid #f5f5f4', fontSize: 13, color: '#57534e',
  },
  dot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 },
  verdict: {
    fontSize: 14, color: '#1c1917', lineHeight: 1.5, marginBottom: 14,
    paddingBottom: 14, borderBottom: '1px solid #f5f5f4',
  },
  legend: { display: 'flex', gap: 18, justifyContent: 'center', marginTop: 10 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#57534e' },
  swatch: { display: 'inline-block', width: 14, height: 3, borderRadius: 2 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#78716c', textTransform: 'uppercase',
    letterSpacing: '0.04em', padding: '0 0 8px', borderBottom: '1px solid #e8e6df',
  },
  td: { fontSize: 13, color: '#57534e', padding: '8px 0', borderBottom: '1px solid #f5f5f4' },
  tdNum: {
    fontSize: 13, color: '#1c1917', padding: '8px 0', borderBottom: '1px solid #f5f5f4',
    textAlign: 'right', fontFamily: "'SF Mono', Menlo, monospace",
  },
  footer: { marginTop: 24, padding: '0 4px', fontSize: 11, color: '#78716c', lineHeight: 1.5 },
  footerStrong: { color: '#57534e', fontWeight: 600 },
};
