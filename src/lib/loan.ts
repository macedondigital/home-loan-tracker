// Standard amortised monthly repayment (principal and interest).
export function calcMonthlyRepayment(principal: number, ratePct: number, years: number): number {
  if (principal <= 0 || ratePct <= 0 || years <= 0) return 0;
  const r = ratePct / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}
