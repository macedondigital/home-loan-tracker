// AUD currency formatting shared across the Scenarios tab.

const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

// Whole-dollar AUD, sign-aware (e.g. -$1,234).
export const fmt = (n: number): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  return sign + aud.format(Math.abs(n));
};

// Compact AUD for tight labels (e.g. $152.6k).
export const fmtCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1000) return `$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
  return fmt(n);
};
