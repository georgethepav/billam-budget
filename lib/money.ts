// All monetary values are stored as integer pence. Positive = credit, negative = debit.

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

export function penceToPounds(pence: number): number {
  return pence / 100;
}

// Full format, e.g. "£1,234.56" or "-£42.00"
export function formatPence(pence: number): string {
  const negative = pence < 0;
  const abs = Math.abs(pence) / 100;
  const formatted = abs.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? "-" : ""}£${formatted}`;
}

// Compact format for cards: "£1.2k" for >= £1000, "£420.00" otherwise.
export function formatPenceCompact(pence: number): string {
  const negative = pence < 0;
  const absPounds = Math.abs(pence) / 100;
  const sign = negative ? "-" : "";
  if (absPounds >= 1000) {
    const k = absPounds / 1000;
    return `${sign}£${k.toFixed(k >= 100 ? 0 : 1)}k`;
  }
  return `${sign}£${absPounds.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Parse a Lloyds-style amount string ("1,234.56" or "12.00") to pence.
export function parseAmountToPence(raw: string): number {
  const cleaned = raw.replace(/[£,\s]/g, "").trim();
  if (cleaned === "") return 0;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}
