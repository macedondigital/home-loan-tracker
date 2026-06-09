import { describe, it, expect } from 'vitest';
import { calcMonthlyRepayment } from './loan';

describe('calcMonthlyRepayment', () => {
  it('computes a standard amortised repayment', () => {
    // 98% of $750k = $735k at 6.5% over 30 years.
    const repayment = calcMonthlyRepayment(735000, 6.5, 30);
    expect(repayment).toBeGreaterThan(4600);
    expect(repayment).toBeLessThan(4700);
  });

  it('matches the closed-form annuity formula', () => {
    const principal = 500000;
    const r = 6.5 / 100 / 12;
    const n = 30 * 12;
    const expected = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    expect(calcMonthlyRepayment(principal, 6.5, 30)).toBeCloseTo(expected, 6);
  });

  it('returns 0 for non-positive inputs', () => {
    expect(calcMonthlyRepayment(0, 6.5, 30)).toBe(0);
    expect(calcMonthlyRepayment(500000, 0, 30)).toBe(0);
    expect(calcMonthlyRepayment(500000, 6.5, 0)).toBe(0);
    expect(calcMonthlyRepayment(-100, 6.5, 30)).toBe(0);
  });
});
