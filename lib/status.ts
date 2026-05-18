// Shared spend-status thresholds. Green = on track, amber >= 80%, red >= 100%,
// deep red >= 120%. Used for weekly trackers and monthly category bars.

export type SpendStatus = "good" | "warn" | "over" | "danger";

export function spendStatus(spent: number, target: number): SpendStatus {
  if (target <= 0) return spent > 0 ? "danger" : "good";
  const ratio = spent / target;
  if (ratio >= 1.2) return "danger";
  if (ratio >= 1) return "over";
  if (ratio >= 0.8) return "warn";
  return "good";
}

export const STATUS_TEXT: Record<SpendStatus, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
  danger: "text-red-700 dark:text-red-500",
};

export const STATUS_BAR: Record<SpendStatus, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  over: "bg-red-500",
  danger: "bg-red-700",
};

// Balance colour: red < 0, amber < £100, green otherwise.
export function balanceStatus(pence: number): SpendStatus {
  if (pence < 0) return "over";
  if (pence < 10000) return "warn";
  return "good";
}
