// Scenario engine for the home-purchase + tax planner. Pure functions over a set
// of shared inputs and a single property scenario. Ported from the prototype.

import { calcStampDuty } from './stamp-duty';
import { calcMonthlyRepayment } from './loan';
import { calcPersonalTax, calcDiv293, SUPER_TOTAL_CAP } from './tax';

// Family Home Guarantee: 98% LVR (2% deposit, no LMI).
export const LVR_FHG = 0.98;

// Inputs shared across all scenarios. The four months to settlement (Jul-Oct
// 2026) are forecast individually, then netted down by a single monthly
// outgoings figure (business costs + living + tax set-aside).
export const FORECAST_MONTHS = 4;

export interface SharedInputs {
  trustProfit: number;
  personalCash: number;
  businessBank: number;
  minBuffer: number;
  revenueJul: number;
  revenueAug: number;
  revenueSep: number;
  revenueOct: number;
  monthlyOutgoings: number;
  interestRate: number;
  loanYears: number;
  otherCosts: number;
}

// A single property-price scenario with its tax levers.
export interface Scenario {
  id: number;
  name: string;
  description: string;
  propertyTarget: number;
  superContrib: number;
  bucket: number;
  prepaid: number;
}

export interface ScenarioResult {
  // Property
  loan: number;
  deposit: number;
  stampDuty: number;
  cashNeeded: number;
  monthlyRepayment: number;
  // Tax
  personalTaxable: number;
  personalDist: number;
  personalIncomeTax: number;
  medicare: number;
  personalTotal: number;
  superTax: number;
  div293: number;
  bucketTax: number;
  totalTax: number;
  taxSaved: number;
  // Cash flow
  superDrawFromBusiness: number;
  businessBankEnd: number;
  personalCashEnd: number;
  totalCashAt30June: number;
  totalRevenueForecast: number;
  totalOutgoingsForecast: number;
  cashGrowthToSettle: number;
  totalCashAtSettlement: number;
  cashAvailableForPurchase: number;
  surplus: number;
  // If any positive surplus is parked in an offset account against the loan
  offsetBalance: number;
  offsetNetLoan: number;
  monthlyInterestSaved: number;
  // Status
  bufferOk30June: boolean;
  bufferAmount30June: number;
  canAffordPurchase: boolean;
  superExceeded: boolean;
}

export function calculate(s: Scenario, shared: SharedInputs): ScenarioResult {
  // Property
  const loan = s.propertyTarget * LVR_FHG;
  const deposit = s.propertyTarget * (1 - LVR_FHG);
  const stampDuty = calcStampDuty(s.propertyTarget);
  const cashNeeded = deposit + stampDuty + shared.otherCosts;
  const monthlyRepayment = calcMonthlyRepayment(loan, shared.interestRate, shared.loanYears);

  // Tax. Prepay reduces trust profit; bucket distribution is taxed separately;
  // super contribution comes out before personal tax is assessed.
  const adjustedProfit = Math.max(0, shared.trustProfit - s.prepaid);
  const personalDist = Math.max(0, adjustedProfit - s.bucket);
  const personalTaxable = Math.max(0, personalDist - s.superContrib);
  const personal = calcPersonalTax(personalTaxable);
  const superTax = s.superContrib * 0.15;
  const div293 = calcDiv293(personalTaxable, s.superContrib);
  const bucketTax = s.bucket * 0.25;
  const totalTax = personal.total + superTax + div293 + bucketTax;
  const baseline = calcPersonalTax(shared.trustProfit);
  const taxSaved = baseline.total - totalTax;

  // Cash flow at 30 June. Super is funded from personal cash first, topped up
  // from the business; prepay is paid by the business. A bucket-company
  // distribution is a tax-timing lever, not a deposit-cash one: the funds are
  // drawn back the following financial year (before the October settlement),
  // so they remain available for the deposit. Like personal income tax (assumed
  // covered by PAYG / franking), the bucket is not deducted from this cash flow.
  const superDrawFromBusiness = Math.max(0, s.superContrib - shared.personalCash);
  const personalCashUsedForSuper = Math.min(s.superContrib, shared.personalCash);
  const businessBankEnd = shared.businessBank - s.prepaid - superDrawFromBusiness;
  const personalCashEnd = shared.personalCash - personalCashUsedForSuper;
  const totalCashAt30June = businessBankEnd + personalCashEnd;

  // Cash at settlement. Forecast revenue for Jul-Oct, netted down by monthly
  // outgoings. Can be negative if outgoings exceed forecast revenue.
  const totalRevenueForecast =
    shared.revenueJul + shared.revenueAug + shared.revenueSep + shared.revenueOct;
  const totalOutgoingsForecast = shared.monthlyOutgoings * FORECAST_MONTHS;
  const cashGrowthToSettle = totalRevenueForecast - totalOutgoingsForecast;
  const totalCashAtSettlement = totalCashAt30June + cashGrowthToSettle;

  // Required vs available (must also retain the minimum business buffer).
  const cashAvailableForPurchase = totalCashAtSettlement - shared.minBuffer;
  const surplus = cashAvailableForPurchase - cashNeeded;

  // Optional: park any positive surplus in an offset account against the loan.
  // The contracted repayment is unchanged (still on the full FHG loan) and the
  // cash stays accessible, but interest is charged only on (loan - offset), so
  // the offset saves roughly offset * rate / 12 of interest each month.
  const offsetBalance = Math.max(0, surplus);
  const offsetNetLoan = Math.max(0, loan - offsetBalance);
  const monthlyInterestSaved = (offsetBalance * (shared.interestRate / 100)) / 12;

  // Status
  const bufferOk30June = businessBankEnd >= shared.minBuffer;
  const bufferAmount30June = businessBankEnd - shared.minBuffer;
  const canAffordPurchase = surplus >= 0;
  const superExceeded = s.superContrib > SUPER_TOTAL_CAP;

  return {
    loan,
    deposit,
    stampDuty,
    cashNeeded,
    monthlyRepayment,
    personalTaxable,
    personalDist,
    personalIncomeTax: personal.incomeTax,
    medicare: personal.medicare,
    personalTotal: personal.total,
    superTax,
    div293,
    bucketTax,
    totalTax,
    taxSaved,
    superDrawFromBusiness,
    businessBankEnd,
    personalCashEnd,
    totalCashAt30June,
    totalRevenueForecast,
    totalOutgoingsForecast,
    cashGrowthToSettle,
    totalCashAtSettlement,
    cashAvailableForPurchase,
    surplus,
    offsetBalance,
    offsetNetLoan,
    monthlyInterestSaved,
    bufferOk30June,
    bufferAmount30June,
    canAffordPurchase,
    superExceeded,
  };
}

export const DEFAULT_SHARED: SharedInputs = {
  trustProfit: 307534,
  personalCash: 10000,
  businessBank: 137000,
  minBuffer: 30000,
  revenueJul: 25000,
  revenueAug: 25000,
  revenueSep: 25000,
  revenueOct: 25000,
  monthlyOutgoings: 13000,
  interestRate: 6.5,
  loanYears: 30,
  otherCosts: 7000,
};

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 1,
    name: 'Conservative ($650k)',
    description: 'Smaller loan, lower repayments.',
    propertyTarget: 650000,
    superContrib: 80000,
    bucket: 0,
    prepaid: 22500,
  },
  {
    id: 2,
    name: 'Middle ($700k)',
    description: 'Balance between space and stretch.',
    propertyTarget: 700000,
    superContrib: 80000,
    bucket: 0,
    prepaid: 22500,
  },
  {
    id: 3,
    name: 'Target ($750k)',
    description: 'Original plan. Higher debt load.',
    propertyTarget: 750000,
    superContrib: 80000,
    bucket: 0,
    prepaid: 22500,
  },
];
