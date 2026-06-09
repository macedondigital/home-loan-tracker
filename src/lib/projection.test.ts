import { describe, it, expect } from 'vitest';
import { project, HORIZON_YEARS } from './projection';

const DEFAULTS = {
  lumpSum: 100000,
  offsetRatePct: 6,
  superRatePct: 9,
  superContribTaxPct: 15,
};

describe('project (offset vs super)', () => {
  it('starts offset at the full lump and super net of contributions tax', () => {
    const r = project(DEFAULTS);
    expect(r.offsetStart).toBeCloseTo(100000, 6);
    expect(r.superStart).toBeCloseTo(85000, 6); // 100000 * (1 - 0.15)
    expect(r.series[0].offset).toBeCloseTo(100000, 6);
    expect(r.series[0].super).toBeCloseTo(85000, 6);
    expect(r.series[0].diff).toBeCloseTo(-15000, 6);
  });

  it('projects each year by its growth rate', () => {
    const r = project(DEFAULTS);
    expect(r.series[6].offset).toBeCloseTo(100000 * Math.pow(1.06, 6), 4);
    expect(r.series[6].super).toBeCloseTo(85000 * Math.pow(1.09, 6), 4);
    expect(r.series.length).toBe(HORIZON_YEARS + 1); // years 0..30
  });

  it('finds super overtaking offset at year 6 with the default 15% entry tax', () => {
    // offset 100k @6% vs super 85k @9%: super passes offset between year 5 and 6.
    const r = project(DEFAULTS);
    expect(r.series[5].super).toBeLessThan(r.series[5].offset);
    expect(r.series[6].super).toBeGreaterThan(r.series[6].offset);
    expect(r.crossoverYear).toBe(6);
  });

  it('has super ahead from the start when there is no entry tax', () => {
    const r = project({ ...DEFAULTS, superContribTaxPct: 0 });
    expect(r.superStart).toBeCloseTo(100000, 6);
    expect(r.crossoverYear).toBe(0); // equal start, higher rate -> ahead immediately
  });

  it('returns null crossover when super never catches offset', () => {
    // Super grows slower and starts lower: never overtakes.
    const r = project({ ...DEFAULTS, superRatePct: 5, superContribTaxPct: 15 });
    expect(r.crossoverYear).toBeNull();
    expect(r.finalDiff).toBeLessThan(0);
  });

  it('reports the horizon gap', () => {
    const r = project(DEFAULTS);
    expect(r.finalDiff).toBeCloseTo(r.series[HORIZON_YEARS].super - r.series[HORIZON_YEARS].offset, 6);
    expect(r.finalDiff).toBeGreaterThan(0); // super well ahead by year 30
  });
});
