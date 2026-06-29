import { useState, useEffect, useRef } from 'react';
import {
  project, projectSequencing, projectWarehouse,
  HORIZON_YEARS, SMSF_EARNINGS_TAX_PCT, SMSF_SETUP_COST,
  type CompareInputs,
} from '../lib/projection';
import { fmt, fmtCompact } from '../lib/format';
import RangeInput from './RangeInput';

const STORAGE_KEY = 'hbo-compare-v3';

type CompareState = CompareInputs & {
  lockYears: number;
  payoffYear: number;
  // Warehouse (SMSF) assumptions
  whPrice: number;
  whDepositPct: number;
  whLrbaRatePct: number;
  whLrbaTermYears: number;
  whGrowthPct: number;
  whGrossRent: number;
  whExpenseRatioPct: number;
  whAdminPerYear: number;
};

const DEFAULTS: CompareState = {
  lumpSum: 100000,
  offsetRatePct: 6,
  superRatePct: 9,
  superContribTaxPct: 30,
  personalTaxPct: 47,
  lockYears: 25,
  payoffYear: 8,
  whPrice: 425000,
  whDepositPct: 40,
  whLrbaRatePct: 8,
  whLrbaTermYears: 20,
  whGrowthPct: 4,
  whGrossRent: 22000,
  whExpenseRatioPct: 15,
  whAdminPerYear: 2500,
};

const OFFSET_COLOR = '#2563eb';
const SUPER_COLOR = '#166534';
const WAREHOUSE_COLOR = '#ea580c';

export default function Compare() {
  const [inputs, setInputs] = useState<CompareState>(DEFAULTS);
  const [showWarehouse, setShowWarehouse] = useState(true);
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

  const wh = projectWarehouse({
    lumpSum: inputs.lumpSum,
    superContribTaxPct: inputs.superContribTaxPct,
    superRatePct: inputs.superRatePct,
    price: inputs.whPrice,
    depositPct: inputs.whDepositPct,
    lrbaRatePct: inputs.whLrbaRatePct,
    lrbaTermYears: inputs.whLrbaTermYears,
    growthPct: inputs.whGrowthPct,
    grossRent: inputs.whGrossRent,
    expenseRatioPct: inputs.whExpenseRatioPct,
    adminPerYear: inputs.whAdminPerYear,
  });

  const afterTaxLump = inputs.lumpSum * (1 - inputs.superContribTaxPct / 100);
  const whDeposit = inputs.whPrice * (inputs.whDepositPct / 100);
  const whFinal = wh.series[HORIZON_YEARS].warehouse;
  const superFinal = series[HORIZON_YEARS].super;
  const offsetFinal = series[HORIZON_YEARS].offset;

  return (
    <div>
      <header style={s.header}>
        <div style={s.eyebrow}>
          <span style={{ color: '#166534' }}>Offset vs super vs warehouse</span>
          <span>{'·'}</span>
          <span>30-year comparison</span>
        </div>
        <h1 style={s.h1}>Pay down the loan, build super, or buy a warehouse?</h1>
        <p style={s.subtitle}>
          Three destinations for the same pre-tax lump sum. Into your home-loan offset
          (a tax-free return equal to your loan rate, always accessible); into super (higher
          long-run growth, taxed going in, locked until you retire); or as the deposit on an
          industrial warehouse held in an SMSF (leveraged property, locked the same as super).
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
            hint="Long-run average, net of fees and earnings tax. Also the rate retained warehouse rent reinvests at."
            onChange={(v) => set('superRatePct', v)}
          />
          <RangeInput
            label="Super entry tax (in fund)" value={inputs.superContribTaxPct} min={0} max={30} step={1} suffix="%"
            hint="Concessional: 15% + 15% Div 293 = 30% for income over $250k. Applies to the super and warehouse routes."
            onChange={(v) => set('superContribTaxPct', v)}
          />
          <RangeInput
            label="Your marginal tax rate" value={inputs.personalTaxPct} min={0} max={47} step={1} suffix="%"
            hint="The cost of holding the cash in offset (you'd draw it personally). 47% at the top."
            onChange={(v) => set('personalTaxPct', v)}
          />
          <RangeInput
            label="Years until super unlocks" value={inputs.lockYears} min={0} max={30} step={1} suffix="yrs"
            hint="Preservation age is 60 (at 39, ~21 yrs). Super and the warehouse are both locked until then."
            onChange={(v) => set('lockYears', v)}
          />
        </div>
        <div style={s.startRow}>
          <span><span style={{ ...s.dot, background: OFFSET_COLOR }} /> Into offset: <strong>{fmt(offsetStart)}</strong>{inputs.personalTaxPct > 0 ? ` (after ${inputs.personalTaxPct}% personal tax)` : ''}</span>
          <span><span style={{ ...s.dot, background: SUPER_COLOR }} /> Into super: <strong>{fmt(superStart)}</strong>{inputs.superContribTaxPct > 0 ? ` (after ${inputs.superContribTaxPct}% in-fund tax)` : ''}</span>
          <span><span style={{ ...s.dot, background: WAREHOUSE_COLOR }} /> Into warehouse: <strong>{fmt(wh.start)}</strong> ({Math.round(wh.share * 100)}% of the deposit)</span>
        </div>
      </div>

      <button type="button" style={{ ...s.cardHeading, ...s.collapseBtn }} onClick={() => setShowWarehouse((v) => !v)}>
        <span style={{ color: WAREHOUSE_COLOR }}>{showWarehouse ? '−' : '+'}</span> Warehouse (SMSF) assumptions
      </button>
      {showWarehouse && (
        <div style={{ ...s.card, marginBottom: 4 }}>
          <div style={s.grid}>
            <RangeInput
              label="Warehouse price" value={inputs.whPrice} min={300000} max={650000} step={5000} prefix="$"
              hint="Mid-point of the $400-450k Belmont / Breakwater target."
              onChange={(v) => set('whPrice', v)}
            />
            <RangeInput
              label="SMSF deposit" value={inputs.whDepositPct} min={20} max={100} step={5} suffix="%"
              hint="Of the price. The rest is borrowed via an LRBA. ~40% is standard for commercial."
              onChange={(v) => set('whDepositPct', v)}
            />
            <RangeInput
              label="LRBA interest rate" value={inputs.whLrbaRatePct} min={4} max={12} step={0.1} suffix="%"
              hint="Commercial SMSF lending, currently ~7-8.5%."
              onChange={(v) => set('whLrbaRatePct', v)}
            />
            <RangeInput
              label="LRBA loan term" value={inputs.whLrbaTermYears} min={5} max={30} step={1} suffix="yrs"
              hint="Amortisation period. The loan clears at the end of the term."
              onChange={(v) => set('whLrbaTermYears', v)}
            />
            <RangeInput
              label="Property capital growth" value={inputs.whGrowthPct} min={0} max={10} step={0.5} suffix="%"
              hint="Per year. Conservative for commercial; also indexes the rent. Industrial varies by location."
              onChange={(v) => set('whGrowthPct', v)}
            />
            <RangeInput
              label="Gross annual rent" value={inputs.whGrossRent} min={0} max={60000} step={1000} prefix="$"
              hint="Your estimate, sublet contribution included. Market rent confirmed by valuation."
              onChange={(v) => set('whGrossRent', v)}
            />
            <RangeInput
              label="Property expenses" value={inputs.whExpenseRatioPct} min={0} max={40} step={1} suffix="%"
              hint="Of gross rent: rates, insurance, maintenance, management."
              onChange={(v) => set('whExpenseRatioPct', v)}
            />
            <RangeInput
              label="SMSF admin / year" value={inputs.whAdminPerYear} min={0} max={6000} step={500} prefix="$"
              hint="Accounting, audit, compliance. A real ongoing drag on the return."
              onChange={(v) => set('whAdminPerYear', v)}
            />
          </div>
          <div style={s.whNote}>
            Your <strong>{fmt(afterTaxLump)}</strong> (after {inputs.superContribTaxPct}% entry tax) is{' '}
            <strong>{Math.round(wh.share * 100)}%</strong> of the {fmt(whDeposit)} SMSF deposit, so the curve tracks that
            share of the warehouse equity: property value, less the amortising LRBA, plus net rent retained in the fund
            (taxed at {SMSF_EARNINGS_TAX_PCT}%). A {fmt(SMSF_SETUP_COST)} setup cost is netted off the start.
          </div>
        </div>
      )}

      <div style={{ ...s.card, marginTop: 16 }}>
        <Verdict crossoverYear={crossoverYear} finalDiff={finalDiff} />
        <div style={s.threeWay}>
          At year {HORIZON_YEARS}: offset <strong>{fmt(offsetFinal)}</strong>, super{' '}
          <strong>{fmt(superFinal)}</strong>, warehouse <strong style={{ color: WAREHOUSE_COLOR }}>{fmt(whFinal)}</strong>.
          {' '}
          {whFinal >= superFinal && whFinal >= offsetFinal
            ? 'The leveraged warehouse finishes ahead, but it is the least liquid and most concentrated of the three.'
            : whFinal >= offsetFinal
              ? 'The warehouse beats offset but trails diversified super, with more concentration risk.'
              : 'The warehouse trails both here; at this growth rate the leverage and costs do not pay off.'}
        </div>
        <Chart
          lines={[
            { values: series.map((p) => p.offset), color: OFFSET_COLOR },
            { values: series.map((p) => p.super), color: SUPER_COLOR },
            { values: wh.series.map((p) => p.warehouse), color: WAREHOUSE_COLOR },
          ]}
          crossoverYear={crossoverYear} crossoverLabel="Super overtakes" lockYears={lockYears}
        />
        <div style={s.legend}>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: OFFSET_COLOR }} /> Offset @ {inputs.offsetRatePct}%</span>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: SUPER_COLOR }} /> Super @ {inputs.superRatePct}%</span>
          <span style={s.legendItem}><span style={{ ...s.swatch, background: WAREHOUSE_COLOR }} /> Warehouse @ {inputs.whGrowthPct}% growth</span>
          {lockYears > 0 && (
            <span style={s.legendItem}><span style={{ ...s.swatch, background: '#fde68a', width: 14, height: 10 }} /> Super + warehouse locked</span>
          )}
        </div>
        {lockYears > 0 && (
          <div style={s.lockNote}>
            Super and the warehouse are locked for {lockYears} {lockYears === 1 ? 'year' : 'years'} (until preservation age).
            Offset stays accessible the whole time, so any crossover inside the shaded years is a paper lead you cannot spend yet.
            The warehouse is the least liquid of all: selling property is slow and costly, and you cannot withdraw part of it.
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
              <th style={{ ...s.th, textAlign: 'right' }}>Warehouse</th>
            </tr>
          </thead>
          <tbody>
            {[5, 10, 20, 30].map((y) => {
              const o = series[y].offset;
              const su = series[y].super;
              const w = wh.series[y].warehouse;
              const best = Math.max(o, su, w);
              const cell = (v: number, color: string) => ({
                ...s.tdNum,
                fontWeight: v === best ? 700 : 400,
                color: v === best ? color : '#1c1917',
              });
              return (
                <tr key={y}>
                  <td style={s.td}>{y}</td>
                  <td style={cell(o, OFFSET_COLOR)}>{fmt(o)}</td>
                  <td style={cell(su, SUPER_COLOR)}>{fmt(su)}</td>
                  <td style={cell(w, WAREHOUSE_COLOR)}>{fmt(w)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={s.tableNote}>Bold is the leader that year. The warehouse purchase is ~mid-2027 in reality; the curve starts at year 0 for comparison, so its first ~18 months are a simplification.</p>
      </div>

      <div style={{ ...s.cardHeading, marginTop: 16 }}>Your real plan: pay it off fast</div>
      <div style={s.card}>
        <p style={s.note}>
          You will clear the loan in a few years, then build super hard. So the real question for
          the {fmt(inputs.lumpSum)} is timing: into super now (locked, {inputs.superRatePct}%), or onto
          the loan now ({inputs.offsetRatePct}% and accessible in your home) and into super once the loan
          clears? This tracks only the {fmt(inputs.lumpSum)} - the rest of your repayment plan is the
          same either way. The warehouse follows the same lock as super, so it sits on the comparison above.
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
          lines={[
            { values: seq.series.map((p) => p.homeFirst), color: OFFSET_COLOR },
            { values: seq.series.map((p) => p.superNow), color: SUPER_COLOR },
          ]}
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
          is yours to use any time. Super is preserved until your preservation age (around 60). The
          warehouse is locked the same way and is harder again to exit: property sells slowly, with agent
          and legal costs, and you cannot draw down part of it. Weigh the gap against when you need the money.
        </p>
        <p>
          <strong style={s.footerStrong}>The deduction is now credited.</strong> This treats the lump as
          pre-tax: offset is taxed at your marginal rate (you would draw it personally), while super and the
          warehouse contribution pay only the in-fund rate. The gap between the start amounts is the value of
          the concessional deduction, which is why both super routes start ahead.
        </p>
        <p>
          <strong style={s.footerStrong}>The warehouse assumes a lot.</strong> It only works if the unit
          qualifies as Business Real Property (used wholly in the agency); otherwise the in-house asset rules
          break the strategy. Your trust must pay market rent (sole purpose test), set by independent valuation.
          The model includes SMSF costs ({fmt(SMSF_SETUP_COST)} setup, {fmt(inputs.whAdminPerYear)}/year) as a
          drag, assumes the LRBA can actually be obtained at the rate and term shown, and uses {inputs.whGrowthPct}%
          growth, which is conservative for commercial but varies widely by location and tenant demand.
        </p>
        <p>
          <strong style={s.footerStrong}>Concentration vs diversification.</strong> The warehouse puts the SMSF
          into a single illiquid asset, the opposite of the diversified, equity-heavy portfolio the 'super'
          curve assumes. Same headline growth can carry very different risk.
        </p>
        <p>
          <strong style={s.footerStrong}>Not financial advice.</strong> A large concessional contribution
          uses your carry-forward room and locks the cash; the warehouse adds SMSF, lending, and property risk
          on top. Confirm the cap, Div 293, BRP qualification, and structure with Sarah before acting.
        </p>
      </div>
    </div>
  );
}

function Verdict({ crossoverYear, finalDiff }: { crossoverYear: number | null; finalDiff: number }) {
  let text: React.ReactNode;
  if (crossoverYear === null) {
    text = <>Offset stays ahead of super for the full {HORIZON_YEARS} years - by {fmt(Math.abs(finalDiff))} at year {HORIZON_YEARS}.</>;
  } else if (crossoverYear === 0) {
    text = <>Super is ahead of offset from the start, and by year {HORIZON_YEARS} it leads by {fmt(finalDiff)}.</>;
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

interface ChartLine {
  values: number[]; // indexed by year, 0..HORIZON_YEARS
  color: string;
}

function Chart({ lines, crossoverYear, crossoverLabel, lockYears }: {
  lines: ChartLine[];
  crossoverYear: number | null;
  crossoverLabel: string;
  lockYears?: number;
}) {
  const W = 640, H = 300;
  const padL = 56, padR = 16, padT = 16, padB = 30;
  const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
  const plotW = x1 - x0, plotH = y1 - y0;

  const yMax = Math.max(1, ...lines.flatMap((l) => l.values)) * 1.05;

  const xScale = (year: number) => x0 + (year / HORIZON_YEARS) * plotW;
  const yScale = (v: number) => y1 - (v / yMax) * plotH;

  const linePoints = (l: ChartLine) =>
    l.values.map((v, year) => `${xScale(year).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xTicks = [0, 5, 10, 15, 20, 25, 30];
  const showCross = crossoverYear !== null && crossoverYear > 0 && crossoverYear < HORIZON_YEARS;
  const crossX = showCross ? xScale(crossoverYear as number) : 0;
  // The crossover dot sits on the "super" line (the second series in both charts).
  const crossLine = lines[1];
  const crossVal = showCross && crossLine ? crossLine.values[crossoverYear as number] : 0;
  const lockX = lockYears && lockYears > 0 && lockYears <= HORIZON_YEARS ? xScale(lockYears) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Lump sum across destinations over 30 years">
      {lockX !== null && (
        <g>
          <rect x={x0} y={y0} width={lockX - x0} height={plotH} fill="#fffbeb" />
          <line x1={lockX} y1={y0} x2={lockX} y2={y1} stroke="#b45309" strokeWidth={1} strokeDasharray="3 3" />
          <text x={lockX - 4} y={y1 - 6} textAnchor="end" fontSize={10} fontWeight={600} fill="#b45309">
            Super + warehouse locked
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

      {showCross && crossLine && (
        <g>
          <line x1={crossX} y1={y0} x2={crossX} y2={y1} stroke="#d6d3d1" strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={crossX} cy={yScale(crossVal)} r={4} fill={crossLine.color} />
          <text x={crossX} y={y0 + 12} textAnchor={crossoverYear! > HORIZON_YEARS / 2 ? 'end' : 'start'} fontSize={10} fontWeight={600} fill={crossLine.color}>
            {`${crossoverLabel} · yr ${crossoverYear}`}
          </text>
        </g>
      )}

      {lines.map((l, i) => (
        <polyline key={i} points={linePoints(l)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" />
      ))}
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
  collapseBtn: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, padding: 0,
    background: 'none', border: 'none', cursor: 'pointer', font: 'inherit',
  },
  card: { background: '#fff', border: '1px solid #e8e6df', borderRadius: 12, padding: 16 },
  grid: { display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' },
  startRow: {
    display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 16, paddingTop: 14,
    borderTop: '1px solid #f5f5f4', fontSize: 13, color: '#57534e',
  },
  dot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 },
  whNote: {
    marginTop: 14, paddingTop: 14, borderTop: '1px solid #f5f5f4',
    fontSize: 12, color: '#57534e', lineHeight: 1.5,
  },
  verdict: {
    fontSize: 14, color: '#1c1917', lineHeight: 1.5, marginBottom: 14,
    paddingBottom: 14, borderBottom: '1px solid #f5f5f4',
  },
  threeWay: { fontSize: 13, color: '#57534e', lineHeight: 1.5, marginBottom: 14 },
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
  tableNote: { fontSize: 11, color: '#a8a29e', lineHeight: 1.4, marginTop: 12, marginBottom: 0 },
  note: { fontSize: 13, color: '#57534e', lineHeight: 1.5, marginBottom: 14, marginTop: 0 },
  seqCaveat: { fontSize: 11, color: '#a8a29e', lineHeight: 1.4, marginTop: 12, marginBottom: 0 },
  footer: { marginTop: 24, padding: '0 4px', fontSize: 11, color: '#78716c', lineHeight: 1.5 },
  footerStrong: { color: '#57534e', fontWeight: 600 },
};
