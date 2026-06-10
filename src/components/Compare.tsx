import { useState, useEffect, useRef } from 'react';
import { project, projectSequencing, HORIZON_YEARS, type CompareInputs } from '../lib/projection';
import { fmt, fmtCompact } from '../lib/format';
import RangeInput from './RangeInput';

const STORAGE_KEY = 'hbo-compare-v2';

type CompareState = CompareInputs & { lockYears: number; payoffYear: number };

const DEFAULTS: CompareState = {
  lumpSum: 100000,
  offsetRatePct: 6,
  superRatePct: 9,
  superContribTaxPct: 30,
  personalTaxPct: 47,
  lockYears: 25,
  payoffYear: 8,
};

const OFFSET_COLOR = '#2563eb';
const SUPER_COLOR = '#166534';

export default function Compare() {
  const [inputs, setInputs] = useState<CompareState>(DEFAULTS);
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

  const set = (field: keyof CompareState, value: number) =>
    setInputs((prev) => ({ ...prev, [field]: value }));

  const result = project(inputs);
  const { series, crossoverYear, offsetStart, superStart, finalDiff } = result;
  const lockYears = inputs.lockYears;

  const seq = projectSequencing({
    lumpSum: inputs.lumpSum,
    loanRatePct: inputs.offsetRatePct,
    superRatePct: inputs.superRatePct,
    superContribTaxPct: inputs.superContribTaxPct,
    personalTaxPct: inputs.personalTaxPct,
    payoffYear: inputs.payoffYear,
  });

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
            label="Pre-tax lump sum" value={inputs.lumpSum} min={0} max={300000} step={5000} prefix="$"
            hint="Trust profit you're deciding how to deploy (before any tax)."
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
            label="Super entry tax (in fund)" value={inputs.superContribTaxPct} min={0} max={30} step={1} suffix="%"
            hint="Concessional: 15% + 15% Div 293 = 30% for income over $250k."
            onChange={(v) => set('superContribTaxPct', v)}
          />
          <RangeInput
            label="Your marginal tax rate" value={inputs.personalTaxPct} min={0} max={47} step={1} suffix="%"
            hint="The cost of holding the cash in offset (you'd draw it personally). 47% at the top."
            onChange={(v) => set('personalTaxPct', v)}
          />
          <RangeInput
            label="Years until super unlocks" value={inputs.lockYears} min={0} max={30} step={1} suffix="yrs"
            hint="Preservation age is 60 (at 39, ~21 yrs). Allow more if you expect it to rise."
            onChange={(v) => set('lockYears', v)}
          />
        </div>
        <div style={s.startRow}>
          <span><span style={{ ...s.dot, background: OFFSET_COLOR }} /> Into offset: <strong>{fmt(offsetStart)}</strong>{inputs.personalTaxPct > 0 ? ` (after ${inputs.personalTaxPct}% personal tax)` : ''}</span>
          <span><span style={{ ...s.dot, background: SUPER_COLOR }} /> Into super: <strong>{fmt(superStart)}</strong>{inputs.superContribTaxPct > 0 ? ` (after ${inputs.superContribTaxPct}% in-fund tax)` : ''}</span>
        </div>
      </div>

      <div style={{ ...s.card, marginTop: 16 }}>
        <Verdict crossoverYear={crossoverYear} finalDiff={finalDiff} />
        <Chart
          data={series.map((p) => ({ year: p.year, a: p.offset, b: p.super }))}
          colorA={OFFSET_COLOR} colorB={SUPER_COLOR}
          crossoverYear={crossoverYear} crossoverLabel="Super overtakes" lockYears={lockYears}
        />
        <div style={s.legend}>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: OFFSET_COLOR }} /> Offset @ {inputs.offsetRatePct}%</span>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: SUPER_COLOR }} /> Super @ {inputs.superRatePct}%</span>
          {lockYears > 0 && (
            <span style={s.legendItem}><span style={{ ...s.swatch, background: '#fde68a', width: 14, height: 10 }} /> Super locked</span>
          )}
        </div>
        {lockYears > 0 && (
          <div style={s.lockNote}>
            Super is locked for {lockYears} {lockYears === 1 ? 'year' : 'years'} (until you can access it).
            Offset stays accessible the whole time, so any crossover inside the shaded years is a paper lead you cannot spend yet.
          </div>
        )}
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

      <div style={{ ...s.cardHeading, marginTop: 16 }}>Your real plan: pay it off fast</div>
      <div style={s.card}>
        <p style={s.note}>
          You will clear the loan in a few years, then build super hard. So the real question for
          the {fmt(inputs.lumpSum)} is timing: into super now (locked, {inputs.superRatePct}%), or onto
          the loan now ({inputs.offsetRatePct}% and accessible in your home) and into super once the loan
          clears? This tracks only the {fmt(inputs.lumpSum)} - the rest of your repayment plan is the
          same either way.
        </p>
        <div style={{ maxWidth: 320, marginBottom: 16 }}>
          <RangeInput
            label="Loan paid off in" value={inputs.payoffYear} min={1} max={20} step={1} suffix="yrs"
            hint="When the loan clears and 'home first' switches to super."
            onChange={(v) => set('payoffYear', v)}
          />
        </div>
        <SeqVerdict crossoverYear={seq.crossoverYear} finalDiff={seq.finalDiff} payoffYear={inputs.payoffYear} />
        <Chart
          data={seq.series.map((p) => ({ year: p.year, a: p.homeFirst, b: p.superNow }))}
          colorA={OFFSET_COLOR} colorB={SUPER_COLOR}
          crossoverYear={seq.crossoverYear} crossoverLabel="Super-now overtakes"
        />
        <div style={s.legend}>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: OFFSET_COLOR }} /> Home first, then super</span>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: SUPER_COLOR }} /> Super now</span>
        </div>
        <table style={{ ...s.table, marginTop: 16 }}>
          <thead>
            <tr>
              <th style={s.th}>Year</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Super now</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Home first</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Difference</th>
            </tr>
          </thead>
          <tbody>
            {[10, 15, 20, 30].map((y) => {
              const row = seq.series[y];
              const ahead = row.diff >= 0;
              return (
                <tr key={y}>
                  <td style={s.td}>{y}</td>
                  <td style={s.tdNum}>{fmt(row.superNow)}</td>
                  <td style={s.tdNum}>{fmt(row.homeFirst)}</td>
                  <td style={{ ...s.tdNum, color: ahead ? SUPER_COLOR : OFFSET_COLOR, fontWeight: 600 }}>
                    {ahead ? 'super +' : 'home +'}{fmt(Math.abs(row.diff))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={s.seqCaveat}>
          Assumes 'home first' redirects to super (after-tax) once the loan clears. Ignores the
          $30k concessional cap and the deduction on concessional contributions (both favour
          super), and Div 293. Indicative, not advice.
        </p>
      </div>

      <div style={s.footer}>
        <p>
          <strong style={s.footerStrong}>Liquidity matters more than the curves.</strong> Offset money
          is yours to use any time. Super is preserved until you reach your preservation age (around 60),
          so a paper win there is not cash you can spend on the house, school fees, or an emergency before
          then. Weigh the gap against when you actually need the money.
        </p>
        <p>
          <strong style={s.footerStrong}>The deduction is now credited.</strong> This treats the lump as
          pre-tax: offset is taxed at your marginal rate (you would draw it personally), super only at the
          in-fund rate. The gap between the two start amounts is the value of the concessional deduction,
          which is why super starts ahead. Drop your marginal rate to see the picture for a lower earner.
        </p>
        <p>
          <strong style={s.footerStrong}>The rates are not equal in certainty.</strong> The offset return
          is your actual loan rate, guaranteed and tax-free. The super figure is a long-run average; real
          returns swing year to year and sequencing matters. Treat the crossover as indicative, not a promise.
        </p>
        <p>
          <strong style={s.footerStrong}>Not financial advice.</strong> A large concessional contribution
          uses your carry-forward room (~$152,610 this year, the oldest slice expiring 30 June 2026), and it
          locks the cash and reduces what's available for the deposit. Confirm the cap, Div 293, and timing
          with Sarah before acting.
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

function SeqVerdict({ crossoverYear, finalDiff, payoffYear }: { crossoverYear: number | null; finalDiff: number; payoffYear: number }) {
  let text: React.ReactNode;
  if (crossoverYear === null) {
    text = <>Paying the home down first stays ahead for the full {HORIZON_YEARS} years - by {fmt(Math.abs(finalDiff))} at year {HORIZON_YEARS} - and your cash stays accessible until the loan clears around year {payoffYear}.</>;
  } else if (crossoverYear === 0) {
    text = <>Super now leads from the start and is ahead by {fmt(finalDiff)} at year {HORIZON_YEARS}.</>;
  } else {
    text = <>Home first leads early, and keeps the cash accessible; <strong>super now overtakes at year {crossoverYear}</strong> and is ahead by {fmt(finalDiff)} at year {HORIZON_YEARS}.</>;
  }
  return <div style={s.verdict}>{text}</div>;
}

function Chart({ data, colorA, colorB, crossoverYear, crossoverLabel, lockYears }: {
  data: { year: number; a: number; b: number }[];
  colorA: string;
  colorB: string;
  crossoverYear: number | null;
  crossoverLabel: string;
  lockYears?: number;
}) {
  const W = 640, H = 300;
  const padL = 56, padR = 16, padT = 16, padB = 30;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const plotW = x1 - x0, plotH = y1 - y0;

  const last = data[data.length - 1];
  const yMax = Math.max(last.a, last.b) * 1.05 || 1;

  const xScale = (year: number) => x0 + (year / HORIZON_YEARS) * plotW;
  const yScale = (v: number) => y1 - (v / yMax) * plotH;

  const line = (key: 'a' | 'b') =>
    data.map((p) => `${xScale(p.year).toFixed(1)},${yScale(p[key]).toFixed(1)}`).join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xTicks = [0, 5, 10, 15, 20, 25, 30];
  const showCross = crossoverYear !== null && crossoverYear > 0 && crossoverYear < HORIZON_YEARS;
  const crossX = showCross ? xScale(crossoverYear as number) : 0;
  const crossPt = showCross ? data[crossoverYear as number] : null;
  const lockX = lockYears && lockYears > 0 && lockYears <= HORIZON_YEARS ? xScale(lockYears) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Two strategies over 30 years">
      {lockX !== null && (
        <g>
          <rect x={x0} y={y0} width={lockX - x0} height={plotH} fill="#fffbeb" />
          <line x1={lockX} y1={y0} x2={lockX} y2={y1} stroke="#b45309" strokeWidth={1} strokeDasharray="3 3" />
          <text x={lockX - 4} y={y1 - 6} textAnchor="end" fontSize={10} fontWeight={600} fill="#b45309">
            Super locked
          </text>
        </g>
      )}
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
          <circle cx={crossX} cy={yScale(crossPt.b)} r={4} fill={colorB} />
          <text x={crossX} y={y0 + 12} textAnchor={crossoverYear! > HORIZON_YEARS / 2 ? 'end' : 'start'} fontSize={10} fontWeight={600} fill={colorB}>
            {`${crossoverLabel} · yr ${crossoverYear}`}
          </text>
        </g>
      )}

      <polyline points={line('a')} fill="none" stroke={colorA} strokeWidth={2} strokeLinejoin="round" />
      <polyline points={line('b')} fill="none" stroke={colorB} strokeWidth={2} strokeLinejoin="round" />
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
  legend: { display: 'flex', gap: 18, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' },
  lockNote: {
    marginTop: 12, padding: '8px 10px', borderRadius: 6, background: '#fffbeb',
    border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.4,
  },
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
  note: { fontSize: 13, color: '#57534e', lineHeight: 1.5, marginBottom: 14, marginTop: 0 },
  seqCaveat: { fontSize: 11, color: '#a8a29e', lineHeight: 1.4, marginTop: 12, marginBottom: 0 },
  footer: { marginTop: 24, padding: '0 4px', fontSize: 11, color: '#78716c', lineHeight: 1.5 },
  footerStrong: { color: '#57534e', fontWeight: 600 },
};
