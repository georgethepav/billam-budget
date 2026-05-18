// Cached facade over lib/queries. Pages import from here so heavy household
// reads are served from Next's Data Cache between navigations instead of
// hitting Neon every time. queries.ts itself is untouched (raw access);
// mutations call revalidateHousehold() to bust this cache.
import { cached } from "./cache";
import * as q from "./queries";

export { VARIABLE_CATEGORIES, HOLIDAY_2026 } from "./queries";
export type { TxFilters } from "./queries";

// Dynamic: depends on filters/search/pagination - must never be cached.
export const getTransactionsPage = q.getTransactionsPage;

export const getAccounts = cached(q.getAccounts, ["getAccounts"]);
export const getAccountStats = cached(q.getAccountStats, ["getAccountStats"]);
export const getRecentImports = cached(q.getRecentImports, ["getRecentImports"]);

export const getBudgetTargets = cached(q.getBudgetTargets, ["getBudgetTargets"]);
export const getSubscriptions = cached(q.getSubscriptions, ["getSubscriptions"]);
export const getBudgetActualsThisMonth = cached(
  q.getBudgetActualsThisMonth,
  ["getBudgetActualsThisMonth"]
);
export const getCategoryOptions = cached(
  q.getCategoryOptions,
  ["getCategoryOptions"]
);

export const getHouseholdPosition = cached(
  q.getHouseholdPosition,
  ["getHouseholdPosition"]
);
export const getTotalSaved = cached(q.getTotalSaved, ["getTotalSaved"]);
export const getSavingsGoalsWithProgress = cached(
  q.getSavingsGoalsWithProgress,
  ["getSavingsGoalsWithProgress"]
);
export const getSavingsTransfers = cached(
  q.getSavingsTransfers,
  ["getSavingsTransfers"]
);

export const getWeeklyTracker = cached(q.getWeeklyTracker, ["getWeeklyTracker"]);
export const getWeeklyHealth = cached(q.getWeeklyHealth, ["getWeeklyHealth"]);
export const getHeadlines = cached(q.getHeadlines, ["getHeadlines"]);
export const getMonthlyCategorySpend = cached(
  q.getMonthlyCategorySpend,
  ["getMonthlyCategorySpend"]
);
export const getRecentTransactions = cached(
  q.getRecentTransactions,
  ["getRecentTransactions"]
);
export const getUncategorised = cached(q.getUncategorised, ["getUncategorised"]);
export const getDaysSinceLastUpload = cached(
  q.getDaysSinceLastUpload,
  ["getDaysSinceLastUpload"]
);

export const getCategoryMonthlySeriesBulk = cached(
  q.getCategoryMonthlySeriesBulk,
  ["getCategoryMonthlySeriesBulk"]
);
export const getAppleBillGroups = cached(
  q.getAppleBillGroups,
  ["getAppleBillGroups"]
);
export const getAppleBills = cached(q.getAppleBills, ["getAppleBills"]);
export const getInsightsComparison = cached(
  q.getInsightsComparison,
  ["getInsightsComparison"]
);
export const getTopSpendsThisWeek = cached(
  q.getTopSpendsThisWeek,
  ["getTopSpendsThisWeek"]
);

export const getOutlookModel = cached(q.getOutlookModel, ["getOutlookModel"]);
