// FY25-26 Australian resident personal tax, Medicare, super, and Division 293.
// Figures confirmed in the brief; super carry-forward confirmed with the ATO
// on 16 May 2026.

// Concessional super caps (FY25-26).
export const SUPER_CURRENT_YEAR = 30000;
export const SUPER_CARRY_FORWARD = 122610;
export const SUPER_TOTAL_CAP = SUPER_CURRENT_YEAR + SUPER_CARRY_FORWARD; // 152610

// Combined-income threshold above which the Division 293 surcharge applies.
export const D293_THRESHOLD = 250000;

export interface PersonalTax {
  incomeTax: number;
  medicare: number;
  total: number;
}

// FY25-26 resident brackets plus the 2% Medicare levy.
export function calcPersonalTax(taxable: number): PersonalTax {
  if (taxable <= 0) return { incomeTax: 0, medicare: 0, total: 0 };
  let tax = 0;
  if (taxable > 18200) tax += Math.min(taxable - 18200, 26800) * 0.16;
  if (taxable > 45000) tax += Math.min(taxable - 45000, 90000) * 0.3;
  if (taxable > 135000) tax += Math.min(taxable - 135000, 55000) * 0.37;
  if (taxable > 190000) tax += (taxable - 190000) * 0.45;
  const medicare = taxable * 0.02;
  return { incomeTax: tax, medicare, total: tax + medicare };
}

// Division 293: an extra 15% on concessional super contributions for the part
// that pushes combined income (taxable + super contribution) over the threshold,
// capped at the contribution amount.
export function calcDiv293(taxable: number, superContrib: number): number {
  const combined = taxable + superContrib;
  if (combined <= D293_THRESHOLD) return 0;
  return Math.min(combined - D293_THRESHOLD, superContrib) * 0.15;
}
