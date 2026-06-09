import { describe, it, expect } from 'vitest';
import { calcStampDuty } from './stamp-duty';

describe('calcStampDuty (VIC standard, no FHB concession)', () => {
  it('matches the brief reference values', () => {
    // Will is not a first home buyer; full standard duty applies.
    expect(Math.round(calcStampDuty(650000))).toBe(34070);
    expect(Math.round(calcStampDuty(700000))).toBe(37070);
    expect(Math.round(calcStampDuty(750000))).toBe(40070);
  });

  it('applies the lowest bracket below $25k', () => {
    expect(calcStampDuty(20000)).toBeCloseTo(20000 * 0.014, 6);
  });

  it('applies the $25k-$130k bracket', () => {
    expect(calcStampDuty(100000)).toBeCloseTo(350 + (100000 - 25000) * 0.024, 6);
  });

  it('applies the $130k-$960k bracket', () => {
    expect(calcStampDuty(500000)).toBeCloseTo(2870 + (500000 - 130000) * 0.06, 6);
  });

  it('applies the top bracket above $960k', () => {
    expect(calcStampDuty(1000000)).toBeCloseTo(55670 + (1000000 - 960000) * 0.055, 6);
  });

  it('is continuous at the $130k boundary', () => {
    expect(calcStampDuty(130000)).toBeCloseTo(2870, 6);
  });

  it('charges marginal 6% at exactly $960k (top of the third bracket)', () => {
    // The brief steps up to a near-flat top rate above $960k, so the formula is
    // intentionally discontinuous there. Will's target range is well below this.
    expect(calcStampDuty(960000)).toBeCloseTo(2870 + (960000 - 130000) * 0.06, 6);
  });
});
