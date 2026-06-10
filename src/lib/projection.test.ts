import { describe, it, expect } from 'vitest';
import { project, projectSequencing, HORIZON_YEARS } from './projection';

// Will's defaults: a concessional contribution pays 15% + 15% Div 293 = 30% in
// the fund, while holding the cash in offset costs his 47% marginal rate.
const DEFAULTS = {
  lumpSum: 100000,
  offsetRatePct: 6,
  superRatePct: 9,
  superContribTaxPct: 30,
  personalTaxPct: 47,
};

describe('project (offset vs super, pre-tax comparison)', () => {
  it('taxes offset at the marginal rate and super at the in-fund rate', () => {
    const r = project(DEFAULTS);
    expect(r.offsetStart).toBeCloseTo(53000, 6); // 100000 * (1 - 0.47)
    expect(r.superStart).toBeCloseTo(70000, 6); // 100000 * (1 - 0.30)
    expect(r.series[0].diff).toBeCloseTo(17000, 6); // super starts ahead once the deduction is credited
  });

  it('projects each year by its growth rate', () => {
    const r = project(DEFAULTS);
    expect(r.series[6].offset).toBeCloseTo(53000 * Math.pow(1.06, 6), 4);
    expect(r.series[6].super).toBeCloseTo(70000 * Math.pow(1.09, 6), 4);
    expect(r.series.length).toBe(HORIZON_YEARS + 1);
  });

  it('has concessional super ahead from the start for a high earner', () => {
    const r = project(DEFAULTS);
    expect(r.series[0].super).toBeGreaterThan(r.series[0].offset);
    expect(r.crossoverYear).toBe(0);
    expect(r.finalDiff).toBeGreaterThan(0);
  });

  it('lets offset win when the personal rate is low and super is taxed/grows worse', () => {
    // Low marginal rate (offset keeps 90k) vs heavy super entry (70k) at a lower rate.
    const r = project({ ...DEFAULTS, personalTaxPct: 10, superRatePct: 5 });
    expect(r.offsetStart).toBeCloseTo(90000, 6);
    expect(r.crossoverYear).toBeNull();
    expect(r.finalDiff).toBeLessThan(0);
  });
});

const SEQ_DEFAULTS = {
  lumpSum: 100000,
  loanRatePct: 6,
  superRatePct: 9,
  superContribTaxPct: 30,
  personalTaxPct: 47,
  payoffYear: 8,
};

describe('projectSequencing (super now vs home first, pre-tax)', () => {
  it('starts super-now at the in-fund net and home-first at the after-personal-tax net', () => {
    const r = projectSequencing(SEQ_DEFAULTS);
    expect(r.series[0].superNow).toBeCloseTo(70000, 6); // 100000 * (1 - 0.30)
    expect(r.series[0].homeFirst).toBeCloseTo(53000, 6); // 100000 * (1 - 0.47)
  });

  it('grows home-first at the loan rate until payoff, then at the super rate', () => {
    const r = projectSequencing(SEQ_DEFAULTS);
    expect(r.series[8].homeFirst).toBeCloseTo(53000 * Math.pow(1.06, 8), 4);
    expect(r.series[9].homeFirst).toBeCloseTo(53000 * Math.pow(1.06, 8) * 1.09, 4);
  });

  it('has concessional super-now ahead from the start for a high earner', () => {
    const r = projectSequencing(SEQ_DEFAULTS);
    expect(r.crossoverYear).toBe(0);
    expect(r.finalDiff).toBeGreaterThan(0);
  });

  it('flips to home-first when the marginal rate is low (deduction worth little)', () => {
    // Low marginal rate -> home-first keeps 90k vs super-now 70k; home-first stays ahead.
    const r = projectSequencing({ ...SEQ_DEFAULTS, personalTaxPct: 10 });
    expect(r.series[0].homeFirst).toBeCloseTo(90000, 6);
    expect(r.crossoverYear).toBeNull();
    expect(r.finalDiff).toBeLessThan(0);
  });
});
