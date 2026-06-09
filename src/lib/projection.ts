// Long-term comparison for deploying a lump sum: into the home-loan offset
// (a tax-free return equal to the loan rate, fully accessible) versus into super
// (higher long-run growth, but taxed on the way in and locked until preservation
// age). Pure functions, projected year by year to the horizon.

export const HORIZON_YEARS = 30;

export interface CompareInputs {
  lumpSum: number;
  offsetRatePct: number; // home-loan / offset rate, e.g. 6
  superRatePct: number; // long-run super growth, e.g. 9
  superContribTaxPct: number; // contributions tax on the way into super, e.g. 15
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
  lumpSum: number;
  loanRatePct: number; // the home-loan rate the "home first" path earns
  superRatePct: number;
  superContribTaxPct: number;
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
  const superNowStart = inputs.lumpSum * (1 - inputs.superContribTaxPct / 100);
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
      ? inputs.lumpSum * Math.pow(loanGrowth, year)
      : inputs.lumpSum * Math.pow(loanGrowth, t) * Math.pow(superGrowth, year - t);
    series.push({ year, superNow, homeFirst, diff: superNow - homeFirst });
    if (crossoverYear === null && superNow >= homeFirst) crossoverYear = year;
  }

  return { series, crossoverYear, finalDiff: series[HORIZON_YEARS].diff };
}

export function project(inputs: CompareInputs): CompareResult {
  const offsetStart = inputs.lumpSum;
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
