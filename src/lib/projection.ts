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
