/**
 * Money utilities for COD Compass.
 * Uses integer paise for internal precision and standard Indian grouping for display.
 */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrExactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number, exact = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹--';
  }
  return exact ? inrExactFormatter.format(amount) : inrFormatter.format(amount);
}

export function formatPercent(rate: number, decimals = 1): string {
  if (isNaN(rate) || rate === null || rate === undefined) {
    return '--%';
  }
  return `${(rate * 100).toFixed(decimals)}%`;
}
