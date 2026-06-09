import { describe, it, expect } from 'vitest';
import { calcPersonalTax, calcDiv293, D293_THRESHOLD, SUPER_TOTAL_CAP } from './tax';

describe('calcPersonalTax (FY25-26 resident brackets + Medicare)', () => {
  it('returns zero for non-positive income', () => {
    expect(calcPersonalTax(0)).toEqual({ incomeTax: 0, medicare: 0, total: 0 });
    expect(calcPersonalTax(-5000)).toEqual({ incomeTax: 0, medicare: 0, total: 0 });
  });

  it('charges no income tax under the tax-free threshold', () => {
    const r = calcPersonalTax(18000);
    expect(r.incomeTax).toBe(0);
    expect(r.medicare).toBeCloseTo(18000 * 0.02, 6);
  });

  it('applies the 16% bracket', () => {
    // $45,000: full first bracket band of $26,800 at 16%.
    expect(calcPersonalTax(45000).incomeTax).toBeCloseTo(26800 * 0.16, 6);
  });

  it('applies the 30% bracket', () => {
    // $135,000: 16% band + 30% on ($135k-$45k).
    const expected = 26800 * 0.16 + 90000 * 0.3;
    expect(calcPersonalTax(135000).incomeTax).toBeCloseTo(expected, 6);
  });

  it('applies the 37% bracket', () => {
    // $190,000: 16% + 30% + 37% on ($190k-$135k).
    const expected = 26800 * 0.16 + 90000 * 0.3 + 55000 * 0.37;
    expect(calcPersonalTax(190000).incomeTax).toBeCloseTo(expected, 6);
  });

  it('applies the 45% top bracket', () => {
    const expected = 26800 * 0.16 + 90000 * 0.3 + 55000 * 0.37 + 10000 * 0.45;
    expect(calcPersonalTax(200000).incomeTax).toBeCloseTo(expected, 6);
  });

  it('includes 2% Medicare in the total', () => {
    const r = calcPersonalTax(100000);
    expect(r.medicare).toBeCloseTo(2000, 6);
    expect(r.total).toBeCloseTo(r.incomeTax + r.medicare, 6);
  });
});

describe('calcDiv293', () => {
  it('is zero when combined income is at or below the threshold', () => {
    expect(calcDiv293(200000, 30000)).toBe(0); // combined 230k <= 250k
    expect(calcDiv293(D293_THRESHOLD - 10000, 10000)).toBe(0); // combined exactly 250k
  });

  it('charges 15% on the lesser of the excess or the super contribution', () => {
    // taxable 240k + super 30k = 270k combined. Excess 20k < super 30k -> 20k taxed.
    expect(calcDiv293(240000, 30000)).toBeCloseTo(20000 * 0.15, 6);
  });

  it('caps the surcharge at the full super contribution', () => {
    // taxable 300k + super 30k = 330k. Excess 80k > super 30k -> 30k taxed.
    expect(calcDiv293(300000, 30000)).toBeCloseTo(30000 * 0.15, 6);
  });
});

describe('super constants', () => {
  it('exposes the total concessional cap from the brief', () => {
    expect(SUPER_TOTAL_CAP).toBe(152610);
  });
});
