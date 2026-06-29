import { describe, it, expect } from 'vitest';
import {
  project, projectSequencing, amortise, projectWarehouse,
  HORIZON_YEARS, SMSF_SETUP_COST,
} from './projection';

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

describe('amortise (LRBA repayment schedule)', () => {
  const rows = amortise(255000, 8, 20);

  it('starts at the full principal and clears by the end of the term', () => {
    expect(rows.length).toBe(HORIZON_YEARS + 1);
    expect(rows[0].balance).toBeCloseTo(255000, 6); // opening balance, no interest yet
    expect(rows[0].interest).toBe(0);
    expect(rows[20].balance).toBeCloseTo(0, 0); // paid off at the 20-year term
    expect(rows[25].balance).toBe(0); // and stays cleared after the term
  });

  it('charges decreasing interest as the balance amortises', () => {
    expect(rows[1].interest).toBeCloseTo(20400, 6); // 255000 * 8%
    expect(rows[2].interest).toBeLessThan(rows[1].interest);
    expect(rows[10].interest).toBeLessThan(rows[2].interest);
  });

  it('treats a zero rate as straight-line', () => {
    const flat = amortise(200000, 0, 20);
    expect(flat[1].balance).toBeCloseTo(190000, 6); // 200000 - 200000/20
    expect(flat[1].interest).toBe(0);
    expect(flat[20].balance).toBeCloseTo(0, 6);
  });
});

const WAREHOUSE_DEFAULTS = {
  lumpSum: 100000,
  superContribTaxPct: 30,
  superRatePct: 9,
  price: 425000,
  depositPct: 40,
  lrbaRatePct: 8,
  lrbaTermYears: 20,
  growthPct: 4,
  grossRent: 22000,
  expenseRatioPct: 15,
  adminPerYear: 2500,
};

describe('projectWarehouse (lump sum into an SMSF warehouse deposit)', () => {
  it('tracks the lump as its proportional share of the deposit pool', () => {
    const r = projectWarehouse(WAREHOUSE_DEFAULTS);
    // afterTaxLump 70000 / deposit 170000 = 0.4118
    expect(r.share).toBeCloseTo(70000 / 170000, 6);
    expect(r.series.length).toBe(HORIZON_YEARS + 1);
  });

  it('starts at the share of (deposit - setup cost) equity', () => {
    const r = projectWarehouse(WAREHOUSE_DEFAULTS);
    // year 0 equity = 425000 - 255000 loan + 0 rent - 7500 setup = 162500
    const expected = (70000 / 170000) * (170000 - SMSF_SETUP_COST);
    expect(r.start).toBeCloseTo(expected, 4);
    expect(r.series[0].warehouse).toBeCloseTo(expected, 4);
  });

  it('grows the attributable equity over the horizon', () => {
    const r = projectWarehouse(WAREHOUSE_DEFAULTS);
    expect(r.series[HORIZON_YEARS].warehouse).toBeGreaterThan(r.start);
  });

  it('caps the share at 100% when the lump covers the whole deposit', () => {
    const r = projectWarehouse({ ...WAREHOUSE_DEFAULTS, lumpSum: 500000 });
    expect(r.share).toBe(1);
  });
});
