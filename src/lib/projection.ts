// Long-term comparison for deploying a lump sum: into the home-loan offset
// (a tax-free return equal to the loan rate, fully accessible) versus into super
// (higher long-run growth, but taxed on the way in and locked until preservation
// age). Pure functions, projected year by year to the horizon.

export const HORIZON_YEARS = 30;

export interface CompareInputs {
  lumpSum: number; // pre-tax amount being deployed (e.g. trust profit)
  offsetRatePct: number; // home-loan / offset rate, e.g. 6
  superRatePct: number; // long-run super growth, e.g. 9
  superContribTaxPct: number; // in-fund tax on a concessional contribution, e.g. 30 (15% + 15% Div 293)
  personalTaxPct: number; // marginal rate paid to hold the cash in offset, e.g. 47
}

export interface CompareYear {
  year: number;
  offset: number;
  super: number;
  diff: number; // super - offset (positive means super ahead)
}

export interface CompareResult {
  series: CompareYear[]; // years 0..HORIZON_YEARS inclusive
  offsetStart: number;
  superStart: number;
  // First year (>= 0) at which super is level with or ahead of offset, or null
  // if super never catches offset within the horizon.
  crossoverYear: number | null;
  finalDiff: number; // super - offset at the horizon
}

// Sequencing comparison for someone paying the loan off fast: does the $100k do
// better going into super NOW (locked, 9%, after entry tax), or onto the LOAN
// now (6% tax-free and accessible in the home until the loan clears at year T,
// then redirected to super)? Only the lump's fate is tracked - the rest of the
// repayment plan is identical between strategies, so the loan balance cancels.

export interface SequencingInputs {
  lumpSum: number; // pre-tax amount being deployed
  loanRatePct: number; // the home-loan rate the "home first" path earns
  superRatePct: number;
  superContribTaxPct: number; // in-fund tax on a concessional contribution (15% + Div 293)
  personalTaxPct: number; // marginal rate paid to hold cash for loan repayment
  payoffYear: number; // T: when the loan is cleared and "home first" switches to super
}

export interface SequencingYear {
  year: number;
  superNow: number;
  homeFirst: number;
  diff: number; // superNow - homeFirst
}

export interface SequencingResult {
  series: SequencingYear[];
  crossoverYear: number | null; // first year superNow is level with or ahead of homeFirst
  finalDiff: number;
}

export function projectSequencing(inputs: SequencingInputs): SequencingResult {
  // Concessional super pays only the in-fund tax; loan repayment is made from
  // after-personal-tax cash, so "home first" starts net of the marginal rate.
  const superNowStart = inputs.lumpSum * (1 - inputs.superContribTaxPct / 100);
  const homeFirstStart = inputs.lumpSum * (1 - inputs.personalTaxPct / 100);
  const loanGrowth = 1 + inputs.loanRatePct / 100;
  const superGrowth = 1 + inputs.superRatePct / 100;
  const t = Math.min(Math.max(inputs.payoffYear, 0), HORIZON_YEARS);

  const series: SequencingYear[] = [];
  let crossoverYear: number | null = null;

  for (let year = 0; year <= HORIZON_YEARS; year++) {
    const superNow = superNowStart * Math.pow(superGrowth, year);
    // Home first: earns the loan rate until payoff, then compounds at the super
    // rate (redirected as an after-tax contribution, so no further entry tax).
    const homeFirst = year <= t
      ? homeFirstStart * Math.pow(loanGrowth, year)
      : homeFirstStart * Math.pow(loanGrowth, t) * Math.pow(superGrowth, year - t);
    series.push({ year, superNow, homeFirst, diff: superNow - homeFirst });
    if (crossoverYear === null && superNow >= homeFirst) crossoverYear = year;
  }

  return { series, crossoverYear, finalDiff: series[HORIZON_YEARS].diff };
}

// Third destination: an industrial warehouse bought through an SMSF. The lump's
// after-entry-tax amount is one slice of the SMSF deposit pool (Option A), so the
// curve tracks that proportional share of the warehouse equity over time:
// property value, less the amortising LRBA balance, plus retained net rent.

export interface WarehouseInputs {
  lumpSum: number; // pre-tax amount being deployed (same lump as the other curves)
  superContribTaxPct: number; // in-fund entry tax on the concessional contribution
  superRatePct: number; // rate at which retained rent is reinvested in the fund
  price: number; // warehouse purchase price
  depositPct: number; // SMSF deposit as a % of price (rest is the LRBA loan)
  lrbaRatePct: number; // LRBA (commercial SMSF) interest rate
  lrbaTermYears: number; // LRBA amortisation period
  growthPct: number; // property capital growth per year (also indexes the rent)
  grossRent: number; // gross annual rent (sublet contribution included)
  expenseRatioPct: number; // property running costs as a % of gross rent
  adminPerYear: number; // SMSF admin / accounting cost per year (a drag on rent)
}

export interface WarehouseYear {
  year: number;
  warehouse: number; // the lump's attributable share of SMSF warehouse equity
}

export interface WarehouseResult {
  series: WarehouseYear[]; // years 0..HORIZON_YEARS inclusive
  share: number; // the lump's slice of the deposit pool (afterTaxLump / deposit)
  start: number; // year-0 attributable equity
}

// SMSF earnings tax in accumulation phase, and a one-off setup cost. Fixed
// constants (rarely varied), surfaced in the page copy rather than as sliders.
export const SMSF_EARNINGS_TAX_PCT = 15;
export const SMSF_SETUP_COST = 7500;

// Standard amortisation: equal annual payments over the term. Returns the closing
// balance and the interest charged for each year 1..termYears (year 0 is the
// opening balance with no interest yet). Beyond the term the loan is cleared.
export function amortise(
  principal: number,
  ratePct: number,
  termYears: number,
): { balance: number; interest: number }[] {
  const r = ratePct / 100;
  const rows: { balance: number; interest: number }[] = [{ balance: principal, interest: 0 }];
  // Equal-payment formula; falls back to straight-line if the rate is zero.
  const payment =
    r === 0 ? principal / termYears : (principal * r) / (1 - Math.pow(1 + r, -termYears));
  let balance = principal;
  for (let year = 1; year <= HORIZON_YEARS; year++) {
    if (year > termYears || balance <= 0) {
      rows.push({ balance: 0, interest: 0 });
      continue;
    }
    const interest = balance * r;
    balance = Math.max(0, balance - (payment - interest));
    rows.push({ balance, interest });
  }
  return rows;
}

export function projectWarehouse(inputs: WarehouseInputs): WarehouseResult {
  const afterTaxLump = inputs.lumpSum * (1 - inputs.superContribTaxPct / 100);
  const deposit = inputs.price * (inputs.depositPct / 100);
  const loan = Math.max(0, inputs.price - deposit);
  // The lump's slice of the deposit pool; capped at 1 (it never owns more than
  // 100% of the equity).
  const share = deposit > 0 ? Math.min(1, afterTaxLump / deposit) : 0;

  const schedule = amortise(loan, inputs.lrbaRatePct, inputs.lrbaTermYears);
  const growth = 1 + inputs.growthPct / 100;
  const reinvest = 1 + inputs.superRatePct / 100;
  const earningsRetain = 1 - SMSF_EARNINGS_TAX_PCT / 100;

  const series: WarehouseYear[] = [];
  let cumRent = 0;
  for (let year = 0; year <= HORIZON_YEARS; year++) {
    const propertyValue = inputs.price * Math.pow(growth, year);
    const lrbaBalance = schedule[year].balance;
    if (year > 0) {
      const grossRent = inputs.grossRent * Math.pow(growth, year);
      const netRent =
        grossRent * (1 - inputs.expenseRatioPct / 100) -
        schedule[year].interest -
        inputs.adminPerYear;
      const afterTaxRent = Math.max(0, netRent) * earningsRetain;
      cumRent = cumRent * reinvest + afterTaxRent;
    }
    const equity = propertyValue - lrbaBalance + cumRent - SMSF_SETUP_COST;
    series.push({ year, warehouse: share * equity });
  }

  return { series, share, start: series[0].warehouse };
}

export function project(inputs: CompareInputs): CompareResult {
  // Pre-tax comparison: to hold the lump in offset you must draw it personally
  // and pay your marginal rate; a concessional super contribution instead pays
  // only the in-fund rate (15% + Div 293), which is how the deduction is credited.
  const offsetStart = inputs.lumpSum * (1 - inputs.personalTaxPct / 100);
  const superStart = inputs.lumpSum * (1 - inputs.superContribTaxPct / 100);
  const offsetGrowth = 1 + inputs.offsetRatePct / 100;
  const superGrowth = 1 + inputs.superRatePct / 100;

  const series: CompareYear[] = [];
  let crossoverYear: number | null = null;

  for (let year = 0; year <= HORIZON_YEARS; year++) {
    const offset = offsetStart * Math.pow(offsetGrowth, year);
    const sup = superStart * Math.pow(superGrowth, year);
    series.push({ year, offset, super: sup, diff: sup - offset });
    if (crossoverYear === null && sup >= offset) crossoverYear = year;
  }

  return {
    series,
    offsetStart,
    superStart,
    crossoverYear,
    finalDiff: series[HORIZON_YEARS].diff,
  };
}
