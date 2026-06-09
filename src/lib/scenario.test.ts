import { describe, it, expect } from 'vitest';
import { calculate, DEFAULT_SHARED, DEFAULT_SCENARIOS } from './scenario';

describe('calculate (default Target $750k scenario, default shared inputs)', () => {
  const target = DEFAULT_SCENARIOS.find((s) => s.propertyTarget === 750000)!;
  const r = calculate(target, DEFAULT_SHARED);

  it('computes the property breakdown', () => {
    expect(r.loan).toBeCloseTo(735000, 6); // 98% LVR
    expect(r.deposit).toBeCloseTo(15000, 6); // 2%
    expect(r.stampDuty).toBeCloseTo(40070, 6);
    expect(r.cashNeeded).toBeCloseTo(62070, 6); // 15000 + 40070 + 7000
  });

  it('computes the tax breakdown', () => {
    // adjustedProfit 297500 - super 80000 = taxable 217500
    expect(r.personalTaxable).toBeCloseTo(217500, 6);
    expect(r.personalTotal).toBeCloseTo(68363, 6); // income tax 64013 + medicare 4350
    expect(r.superTax).toBeCloseTo(12000, 6); // 80000 * 15%
    expect(r.div293).toBeCloseTo(7125, 6); // (297500-250000) * 15%
    expect(r.totalTax).toBeCloseTo(87488, 6);
    expect(r.taxSaved).toBeCloseTo(29050, 6); // baseline 116538 - 87488
  });

  it('computes the cash flow to settlement', () => {
    expect(r.businessBankEnd).toBeCloseTo(47500, 6); // 140000 - 22500 prepay - 70000 super top-up
    expect(r.personalCashEnd).toBeCloseTo(0, 6); // 10000 - 10000 to super
    expect(r.totalCashAt30June).toBeCloseTo(47500, 6);
    expect(r.cashGrowthToSettle).toBeCloseTo(40000, 6); // 10000 * 4
    expect(r.totalCashAtSettlement).toBeCloseTo(87500, 6);
    expect(r.cashAvailableForPurchase).toBeCloseTo(57500, 6); // less 30000 buffer
    expect(r.surplus).toBeCloseTo(-4570, 6); // 57500 - 62070
  });

  it('computes status flags', () => {
    expect(r.bufferOk30June).toBe(true); // 47500 >= 30000
    expect(r.canAffordPurchase).toBe(false); // deficit
    expect(r.superExceeded).toBe(false); // 80000 < 152610 cap
  });
});

describe('calculate edge cases', () => {
  it('flags super contributions over the cap', () => {
    const s = { ...DEFAULT_SCENARIOS[0], superContrib: 160000 };
    expect(calculate(s, DEFAULT_SHARED).superExceeded).toBe(true);
  });

  it('flags a 30 June buffer breach when business bank is drained', () => {
    const shared = { ...DEFAULT_SHARED, businessBank: 60000 };
    const s = { ...DEFAULT_SCENARIOS[2], superContrib: 80000, prepaid: 22500 };
    // 60000 - 22500 - 70000 = -32500, below the 30000 buffer.
    expect(calculate(s, shared).bufferOk30June).toBe(false);
  });

  it('never returns negative personal cash', () => {
    const s = { ...DEFAULT_SCENARIOS[0], superContrib: 5000 };
    const shared = { ...DEFAULT_SHARED, personalCash: 10000 };
    expect(calculate(s, shared).personalCashEnd).toBeGreaterThanOrEqual(0);
  });
});
