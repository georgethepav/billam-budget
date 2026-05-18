import type { CategoryRule } from "@/db/schema";

export type CategoryResult = {
  category: string;
  subcategory: string | null;
  isExcluded: boolean;
};

export const UNCATEGORISED: CategoryResult = {
  category: "Uncategorised",
  subcategory: null,
  isExcluded: false,
};

// Rules are applied in priority order (ascending = higher priority first).
// First case-insensitive substring match wins. Direction-conditional rules
// only match credits (amount > 0) or debits (amount < 0) accordingly.
export function categorise(
  description: string,
  amountPence: number,
  rules: CategoryRule[]
): CategoryResult {
  const haystack = description.toUpperCase();
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (rule.direction === "credit" && amountPence <= 0) continue;
    if (rule.direction === "debit" && amountPence >= 0) continue;

    // A pattern may require multiple substrings, joined by " + " in the seed
    // (e.g. ZETTLE + BARBE means both must be present).
    const parts = rule.pattern.split(" + ").map((p) => p.trim().toUpperCase());
    const allPresent = parts.every((p) => haystack.includes(p));

    if (allPresent) {
      return {
        category: rule.category,
        subcategory: rule.subcategory ?? null,
        isExcluded: rule.markExcluded,
      };
    }
  }

  return { ...UNCATEGORISED };
}
