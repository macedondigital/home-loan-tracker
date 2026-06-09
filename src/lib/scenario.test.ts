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
    // Revenue 25000 x4 = 100000, less outgoings 13000 x4 = 52000 -> net 48000.
    expect(r.totalRevenueForecast).toBeCloseTo(100000, 6);
    expect(r.totalOutgoingsForecast).toBeCloseTo(52000, 6);
    expect(r.cashGrowthToSettle).toBeCloseTo(48000, 6);
    expect(r.totalCashAtSettlement).toBeCloseTo(95500, 6); // 47500 + 48000
    expect(r.cashAvailableForPurchase).toBeCloseTo(65500, 6); // less 30000 buffer
    expect(r.surplus).toBeCloseTo(3430, 6); // 65500 - 62070
  });

  it('computes status flags', () => {
    expect(r.bufferOk30June).toBe(true); // 47500 >= 30000
    expect(r.canAffordPurchase).toBe(true); // surplus with the revenue forecast
    expect(r.superExceeded).toBe(false); // 80000 < 152610 cap
  });
});

describe('calculate revenue-forecast netting', () => {
  it('nets forecast revenue down by monthly outgoings over four months', () => {
    const shared = {
      ...DEFAULT_SHARED,
      revenueJul: 30000, revenueAug: 20000, revenueSep: 25000, revenueOct: 15000,
      monthlyOutgoings: 12000,
    };
    const r = calculate(DEFAULT_SCENARIOS[0], shared);
    expect(r.totalRevenueForecast).toBeCloseTo(90000, 6);
    expect(r.totalOutgoingsForecast).toBeCloseTo(48000, 6); // 12000 * 4
    expect(r.cashGrowthToSettle).toBeCloseTo(42000, 6); // 90000 - 48000
  });

  it('allows negative cash growth when outgoings exceed revenue', () => {
    const shared = {
      ...DEFAULT_SHARED,
      revenueJul: 8000, revenueAug: 8000, revenueSep: 8000, revenueOct: 8000,
      monthlyOutgoings: 13000,
    };
    const r = calculate(DEFAULT_SCENARIOS[0], shared);
    expect(r.cashGrowthToSettle).toBeCloseTo(-20000, 6); // 32000 - 52000
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

  it('parks positive surplus in offset and computes the monthly interest saved', () => {
    // Default Target has a +$3,430 surplus at 6.5%.
    const r = calculate(DEFAULT_SCENARIOS[2], DEFAULT_SHARED);
    expect(r.surplus).toBeGreaterThan(0);
    expect(r.offsetBalance).toBeCloseTo(r.surplus, 6);
    expect(r.offsetNetLoan).toBeCloseTo(r.loan - r.surplus, 6);
    // Interest saved = offset * annual rate / 12.
    expect(r.monthlyInterestSaved).toBeCloseTo((r.surplus * 0.065) / 12, 6);
  });

  it('parks nothing in offset when the scenario is in deficit', () => {
    const shared = { ...DEFAULT_SHARED, businessBank: 40000 };
    const r = calculate(DEFAULT_SCENARIOS[2], shared);
    expect(r.surplus).toBeLessThan(0);
    expect(r.offsetBalance).toBe(0);
    expect(r.monthlyInterestSaved).toBe(0);
    expect(r.offsetNetLoan).toBeCloseTo(r.loan, 6);
  });

  it('treats a bucket distribution as tax-timing, not a deposit-cash change', () => {
    const base = { ...DEFAULT_SCENARIOS[0], bucket: 0 };
    const withBucket = { ...DEFAULT_SCENARIOS[0], bucket: 40000 };
    const rBase = calculate(base, DEFAULT_SHARED);
    const rBucket = calculate(withBucket, DEFAULT_SHARED);
    // Funds are drawn back before settlement, so deposit cash and surplus are
    // unchanged by the bucket.
    expect(rBucket.businessBankEnd).toBeCloseTo(rBase.businessBankEnd, 6);
    expect(rBucket.surplus).toBeCloseTo(rBase.surplus, 6);
    // The bucket still moves the tax breakdown: 25% company tax, and lower
    // personal taxable (distribution routed away from personal income).
    expect(rBucket.bucketTax).toBeCloseTo(10000, 6);
    expect(rBucket.personalTaxable).toBeCloseTo(rBase.personalTaxable - 40000, 6);
  });
});
